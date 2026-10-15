// Upserts the bundled topic list (src/data/topics.ts) into Firestore's `topics` collection.
//
// Usage: npm run seed:topics
// Needs GOOGLE_APPLICATION_CREDENTIALS pointing at a service-account key JSON
// (Firebase console → Project settings → Service accounts → Generate new private key),
// and NEXT_PUBLIC_FIREBASE_PROJECT_ID, e.g. in .env.local.
//
// Topics already in Firestore but no longer in the file are marked inactive, not deleted,
// so past practice records still point at a real topic.

import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { topics } from "../src/data/topics.ts";

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
if (!projectId) {
  console.error("Set NEXT_PUBLIC_FIREBASE_PROJECT_ID (e.g. in .env.local).");
  process.exit(1);
}
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error("Set GOOGLE_APPLICATION_CREDENTIALS to the path of your service-account key JSON.");
  process.exit(1);
}

initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore();
const col = db.collection("topics");

const keep = new Set(topics.map((t) => t.id));
const existing = await col.select().get();
const retired = existing.docs.filter((d) => !keep.has(d.id));

// Firestore batches are capped at 500 writes.
const writes = [
  ...topics.map((t) => (b) => b.set(col.doc(t.id), { text: t.text, level: t.level, active: true })),
  ...retired.map((d) => (b) => b.update(d.ref, { active: false })),
];
for (let i = 0; i < writes.length; i += 500) {
  const batch = db.batch();
  writes.slice(i, i + 500).forEach((w) => w(batch));
  await batch.commit();
}

const counts = Object.groupBy(topics, (t) => t.level);
console.log(
  `Seeded ${topics.length} topics into ${projectId} ` +
    `(beginner ${counts.beginner?.length ?? 0}, intermediate ${counts.intermediate?.length ?? 0}, pro ${counts.pro?.length ?? 0}); ` +
    `${retired.length} retired.`,
);
