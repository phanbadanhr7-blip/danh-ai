import {
  Bot,
  LoaderCircle,
  LogOut,
  MessageSquarePlus,
  PanelLeft,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchCloudConversations, saveConversationToCloud, saveProfileToCloud } from './lib/cloud';
import { signInWithGoogle, signOutFromFirebase } from './lib/firebase';
import { makeId } from './lib/id';
import {
  clearUser,
  loadActiveConversationId,
  loadConversations,
  loadUser,
  saveActiveConversationId,
  saveConversations,
  saveUser,
} from './lib/storage';
import type { Conversation, Message, SessionUser } from './types';

const APP_NAME = 'DANH AI';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const CHAT_ENDPOINT = API_BASE_URL ? `${API_BASE_URL}/api/chat` : '/api/chat';

function makeWelcomeMessage(): Message {
  return {
    id: makeId('welcome'),
    role: 'assistant',
    content: 'Chào Danh. Mình đã sẵn sàng — bản này dùng Google login + Firebase sync, còn backend chat tách riêng để khỏi bị chặn bởi Firebase Blaze.',
    createdAt: Date.now(),
  };
}

function makeConversation(title = 'New chat'): Conversation {
  const now = Date.now();
  return {
    id: makeId('chat'),
    title,
    messages: [makeWelcomeMessage()],
    createdAt: now,
    updatedAt: now,
  };
}

function titleFromMessage(input: string) {
  return input.trim().slice(0, 42) || 'New chat';
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(() => loadUser());
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const stored = loadConversations();
    return stored.length ? stored : [makeConversation()];
  });
  const [activeId, setActiveId] = useState<string>(() => {
    const stored = loadActiveConversationId();
    const local = loadConversations();
    return stored || local[0]?.id || 'bootstrap';
  });
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'syncing' | 'ready' | 'error'>('idle');
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversations.length) {
      const fresh = makeConversation();
      setConversations([fresh]);
      setActiveId(fresh.id);
      return;
    }

    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    if (activeId) saveActiveConversationId(activeId);
  }, [activeId]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' });
  }, [activeId, conversations, loading]);

  useEffect(() => {
    let cancelled = false;

    async function bootCloud() {
      if (!user?.firebaseUid) return;
      setCloudStatus('syncing');

      try {
        await saveProfileToCloud(user.firebaseUid, { name: user.name });
        const remote = await fetchCloudConversations(user.firebaseUid);
        if (cancelled) return;

        if (remote.length) {
          setConversations((current) => {
            const localMap = new Map(current.map((item) => [item.id, item]));
            for (const item of remote) {
              const local = localMap.get(item.id);
              if (!local || item.updatedAt > local.updatedAt) {
                localMap.set(item.id, item);
              }
            }
            return Array.from(localMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);
          });
          setActiveId((current) => current || remote[0].id);
        }

        setCloudStatus('ready');
      } catch (cloudError) {
        console.error(cloudError);
        if (!cancelled) setCloudStatus('error');
      }
    }

    void bootCloud();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user?.firebaseUid || cloudStatus !== 'ready') return;
    void Promise.all(conversations.map((conversation) => saveConversationToCloud(user.firebaseUid!, conversation))).catch(
      (cloudError) => {
        console.error(cloudError);
        setCloudStatus('error');
      },
    );
  }, [conversations, user, cloudStatus]);

  const activeConversation = useMemo(() => {
    return conversations.find((item) => item.id === activeId) ?? conversations[0];
  }, [activeId, conversations]);

  const messages = activeConversation?.messages ?? [];
  const canSend = useMemo(() => !!user && prompt.trim().length > 0 && !loading, [user, prompt, loading]);

  function updateConversation(conversationId: string, updater: (conversation: Conversation) => Conversation) {
    setConversations((current) => current.map((item) => (item.id === conversationId ? updater(item) : item)));
  }

  async function handleGoogleLogin() {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const firebaseUser = await signInWithGoogle();
      const nextUser: SessionUser = {
        name: firebaseUser.displayName || 'Danh',
        email: firebaseUser.email || undefined,
        photoURL: firebaseUser.photoURL || undefined,
        firebaseUid: firebaseUser.uid,
      };
      saveUser(nextUser);
      setUser(nextUser);
    } catch (loginError) {
      console.error(loginError);
      setAuthError('Google login thất bại. Kiểm tra lại Firebase Auth và Authorized domains.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    await signOutFromFirebase().catch(() => undefined);
    clearUser();
    setUser(null);
    setAuthError(null);
    setCloudStatus('idle');
  }

  function createNewChat() {
    const next = makeConversation();
    setConversations((current) => [next, ...current]);
    setActiveId(next.id);
    setError(null);
  }

  function clearCurrentChat() {
    if (!activeConversation) return;
    updateConversation(activeConversation.id, (conversation) => ({
      ...conversation,
      title: 'New chat',
      messages: [makeWelcomeMessage()],
      updatedAt: Date.now(),
    }));
    setError(null);
  }

  function deleteConversation(id: string) {
    const remaining = conversations.filter((item) => item.id !== id);
    if (!remaining.length) {
      const next = makeConversation();
      setConversations([next]);
      setActiveId(next.id);
      return;
    }
    setConversations(remaining);
    if (activeId === id) setActiveId(remaining[0].id);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const content = prompt.trim();
    if (!content || loading || !activeConversation || !user) return;

    const userMessage: Message = {
      id: makeId(),
      role: 'user',
      content,
      createdAt: Date.now(),
    };

    const nextMessages = [...activeConversation.messages, userMessage];
    updateConversation(activeConversation.id, (conversation) => ({
      ...conversation,
      title: conversation.messages.length <= 1 ? titleFromMessage(content) : conversation.title,
      messages: nextMessages,
      updatedAt: Date.now(),
    }));

    setPrompt('');
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content: messageContent }) => ({ role, content: messageContent })),
          user: user.name,
        }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };
      const reply = data.reply;
      if (!response.ok || !reply) {
        throw new Error(data.error || 'Request failed');
      }

      updateConversation(activeConversation.id, (conversation) => ({
        ...conversation,
        messages: [
          ...conversation.messages,
          {
            id: makeId(),
            role: 'assistant',
            content: reply,
            createdAt: Date.now(),
          },
        ],
        updatedAt: Date.now(),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="login-shell">
        <div className="ambient ambient-a" />
        <div className="ambient ambient-b" />

        <main className="login-card">
          <div className="eyebrow">
            <Sparkles size={14} />
            Firebase Hosting + Vercel API
          </div>
          <h1>{APP_NAME}</h1>
          <p className="subtitle">
            Đăng nhập bằng Google để gắn lịch sử chat với tài khoản thật của bạn và deploy trọn bộ lên Firebase.
          </p>

          {authError ? <div className="error-banner">{authError}</div> : null}

          <button className="primary-button" type="button" onClick={handleGoogleLogin} disabled={authLoading}>
            {authLoading ? <LoaderCircle size={18} className="spin" /> : null}
            {authLoading ? 'Đang đăng nhập...' : 'Tiếp tục với Google'}
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="workspace-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-top">
          <button className="icon-button" type="button" onClick={() => setSidebarOpen((value) => !value)}>
            <PanelLeft size={18} />
          </button>

          <button className="new-chat-button" type="button" onClick={createNewChat}>
            <MessageSquarePlus size={16} />
            {sidebarOpen ? 'New chat' : null}
          </button>
        </div>

        <div className="conversation-list">
          {conversations
            .slice()
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map((conversation) => (
              <button
                key={conversation.id}
                className={`conversation-item ${conversation.id === activeId ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveId(conversation.id)}
              >
                <div className="conversation-copy">
                  <strong>{conversation.title}</strong>
                  {sidebarOpen ? <span>{formatTime(conversation.updatedAt)}</span> : null}
                </div>

                {sidebarOpen ? (
                  <span
                    className="delete-mark"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteConversation(conversation.id);
                    }}
                  >
                    ×
                  </span>
                ) : null}
              </button>
            ))}
        </div>

        <div className="sidebar-footer">
          <div className="profile-chip">
            <div className="avatar user-avatar">{user.name.slice(0, 1).toUpperCase()}</div>
            {sidebarOpen ? (
              <div>
                <strong>{user.name}</strong>
                <span>
                  {cloudStatus === 'ready'
                    ? user.email || 'Firebase sync on'
                    : cloudStatus === 'syncing'
                      ? 'Syncing Firebase...'
                      : cloudStatus === 'error'
                        ? 'Firebase sync error'
                        : user.email || 'Logged in'}
                </span>
              </div>
            ) : null}
          </div>

          <button className="icon-button ghost-danger" type="button" onClick={handleLogout} title="Log out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main className="chat-layout">
        <header className="chat-topbar">
          <div>
            <div className="eyebrow compact">
              <Sparkles size={14} />
              {APP_NAME}
            </div>
            <h2>{activeConversation?.title || 'New chat'}</h2>
          </div>

          <button className="ghost-button" onClick={clearCurrentChat} type="button">
            <Trash2 size={16} />
            Reset chat
          </button>
        </header>

        <section className="messages chatgptish" ref={scrollerRef}>
          {messages.map((message) => (
            <article key={message.id} className={`message-row ${message.role}`}>
              <div className="message-card">
                <div className={`avatar ${message.role === 'assistant' ? '' : 'user-avatar'}`}>
                  {message.role === 'assistant' ? <Bot size={16} /> : user.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="message-content-wrap">
                  <div className="message-head">
                    <strong>{message.role === 'assistant' ? APP_NAME : user.name}</strong>
                    <span>{formatTime(message.createdAt)}</span>
                  </div>
                  <div className="message-text">{message.content}</div>
                </div>
              </div>
            </article>
          ))}

          {loading && (
            <article className="message-row assistant">
              <div className="message-card">
                <div className="avatar">
                  <Bot size={16} />
                </div>
                <div className="message-content-wrap">
                  <div className="message-head">
                    <strong>{APP_NAME}</strong>
                  </div>
                  <div className="message-text typing">
                    <LoaderCircle size={16} className="spin" />
                    Thinking…
                  </div>
                </div>
              </div>
            </article>
          )}
        </section>

        <footer className="composer-wrap chat-footer">
          {error ? <div className="error-banner">{error}</div> : null}

          <form className="composer chatgptish-composer" onSubmit={handleSubmit}>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Nhắn DANH AI..."
              rows={1}
            />

            <button className="send-button" type="submit" disabled={!canSend}>
              {loading ? <LoaderCircle size={18} className="spin" /> : <Send size={18} />}
            </button>
          </form>

          <p className="hint">
            {cloudStatus === 'ready'
              ? 'Google login + Firebase sync đang hoạt động. Chat đang đi qua backend riêng.'
              : cloudStatus === 'syncing'
                ? 'Đang đồng bộ lịch sử lên Firebase...'
                : cloudStatus === 'error'
                  ? 'Đăng nhập được nhưng Firebase sync đang lỗi. Kiểm tra Firestore rules.'
                  : 'Đang chờ sync Firebase.'}
          </p>
        </footer>
      </main>
    </div>
  );
}
