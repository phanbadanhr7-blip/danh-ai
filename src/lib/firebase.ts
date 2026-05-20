import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCifUiJ3HJ0jtT6I-vz6EVezY0T5HEx9tI',
  authDomain: 'gemini-46e25.firebaseapp.com',
  projectId: 'gemini-46e25',
  storageBucket: 'gemini-46e25.firebasestorage.app',
  messagingSenderId: '330242130687',
  appId: '1:330242130687:web:9eae9dd3911aa8b5c902ca',
};

const app = initializeApp(firebaseConfig);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

export const auth = getAuth(app);
export const db = getFirestore(app);

export async function signInWithGoogle(): Promise<User> {
  const credential = await signInWithPopup(auth, provider);
  return credential.user;
}

export async function signOutFromFirebase() {
  await signOut(auth);
}
