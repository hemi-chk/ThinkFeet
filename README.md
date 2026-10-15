# ThinkFeet

Impromptu speeches supporting platform: practise Table Topics with random topics by level, prep time, spoken announcements, live timing lights and audio recording. Sign in to keep a history of your speeches.

Built with Next.js, Tailwind CSS, shadcn/ui and Firebase (Auth + Firestore).

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:3000. Without Firebase configured the app runs in **public mode**: everything works except sign-in and saved history.

## Firebase setup

1. Create a project at https://console.firebase.google.com and add a **Web app**.
2. Copy `.env.example` to `.env.local` and fill in the values from the web app's config.
3. **Authentication → Sign-in method**: enable **Google**, **Email/Password**, and **Email link (passwordless sign-in)** (the toggle inside Email/Password).
4. **Authentication → Settings → Authorized domains**: `localhost` is there by default; add your production domain when you deploy.
5. **Firestore Database**: create a database, then deploy the security rules:
   ```sh
   npm run deploy:rules -- --project <your-project-id>
   ```
   (or paste `firestore.rules` into the console's Rules tab).
6. Load the topics into Firestore:
   - **Project settings → Service accounts → Generate new private key**, save the JSON **outside this repo**.
   - Add `GOOGLE_APPLICATION_CREDENTIALS=C:/path/to/key.json` to `.env.local`.
   - `npm run seed:topics`

The app falls back to the bundled list in `src/data/topics.ts` until Firestore has topics.

## Data model

| Path | Contents |
|---|---|
| `topics/{topicId}` | `text`, `level` (beginner / intermediate / pro), `active` |
| `users/{uid}` | `displayName`, `email`, `joinedAt`, `lastSeenAt` |
| `users/{uid}/sessions/{id}` | one speech: topic, chosen level, prep/recorded flags, `durationMs`, `verdict`, `createdAt` |

Verdicts follow Table Topics timing (`src/lib/timing.ts`): `under` < 1:00, `short` 1:00–1:30, `perfect` 1:30–2:00, `grace` 2:00–2:30, `over` > 2:30.

## Editing topics

Edit the lists in `src/data/topics.ts` (append new topics to the end of a level so IDs stay stable), then run `npm run seed:topics`. Topics removed from the file are marked inactive in Firestore rather than deleted.
