import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Conversation } from '../types';

function cleanConversation(conversation: Conversation) {
  return {
    ...conversation,
    messages: conversation.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    })),
  };
}

export async function fetchCloudConversations(uid: string): Promise<Conversation[]> {
  const ref = collection(db, 'users', uid, 'conversations');
  const snapshot = await getDocs(query(ref, orderBy('updatedAt', 'desc')));
  return snapshot.docs.map((item) => item.data() as Conversation);
}

export async function saveConversationToCloud(uid: string, conversation: Conversation) {
  const ref = doc(db, 'users', uid, 'conversations', conversation.id);
  await setDoc(
    ref,
    {
      ...cleanConversation(conversation),
      syncedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function saveProfileToCloud(uid: string, profile: { name: string }) {
  const ref = doc(db, 'users', uid);
  await setDoc(
    ref,
    {
      name: profile.name,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
