# DANH AI

DANH AI is split into two simple parts:

- **Firebase Hosting + Auth + Firestore** for the frontend, Google login, and chat history
- **Vercel API** for the `/api/chat` backend that calls OpenRouter

This avoids Firebase Blaze while you are still testing.

## Architecture

### Firebase side
- Hosting serves the React app
- Google login via Firebase Auth
- Firestore stores each user's chat history

### Vercel side
- `api/chat.ts` runs as the backend
- OpenRouter API key stays on Vercel, not in the browser

## Frontend local dev

```bash
npm install
cp .env.example .env
npm run build
```

Set the frontend env:

```env
APP_TITLE=DANH AI
VITE_API_BASE_URL=https://your-vercel-backend.vercel.app
```

## Vercel backend setup

Deploy this same repo/folder to Vercel for the backend route `api/chat.ts`.

Set these env vars in Vercel:

```env
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=google/gemma-3-27b-it:free
```

You can later change the model to a paid one when you have budget.

## Firebase console setup

1. Enable **Google** provider in Authentication.
2. Add your Firebase Hosting domain to **Authorized domains**.
3. Create **Firestore Database**.
4. Deploy the included Firestore rules.

Rules file is already included as `firestore.rules`.

## Deploy frontend to Firebase

```bash
npm run build
firebase deploy --only firestore:rules
firebase deploy --only hosting
```

## Deploy backend to Vercel

- Import the project into Vercel
- Keep `api/chat.ts`
- Add `OPENROUTER_API_KEY`
- Add `OPENROUTER_MODEL`
- Deploy
- Copy the Vercel domain and set it as `VITE_API_BASE_URL` for the Firebase frontend

## Important flow

1. Deploy backend to Vercel first
2. Copy Vercel URL
3. Put that URL into `VITE_API_BASE_URL`
4. Build again
5. Deploy frontend to Firebase Hosting

## Notes

- Chat history is stored locally first, then synced to Firestore.
- If Firestore rules are wrong, login may still work but cloud history sync will fail.
- You do **not** need Firebase Functions for this version.
