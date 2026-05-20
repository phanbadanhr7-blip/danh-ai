import type { Conversation, SessionUser } from '../types';

const CONVERSATIONS_KEY = 'danh-webapp-conversations';
const USER_KEY = 'danh-webapp-user';
const ACTIVE_KEY = 'danh-webapp-active-conversation';

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveConversations(conversations: Conversation[]) {
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
}

export function loadUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function saveUser(user: SessionUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearUser() {
  localStorage.removeItem(USER_KEY);
}

export function loadActiveConversationId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

export function saveActiveConversationId(id: string) {
  localStorage.setItem(ACTIVE_KEY, id);
}
