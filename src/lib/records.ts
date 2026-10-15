import { addDoc, collection, doc, getDocs, query, serverTimestamp, setDoc, Timestamp, where } from "firebase/firestore";
import type { User } from "firebase/auth";
import type { Level, Topic } from "@/data/topics";
import { db } from "@/lib/firebase";
import type { LevelChoice } from "@/lib/session";
import type { Verdict } from "@/lib/timing";

/*
 * Firestore layout (rules in /firestore.rules):
 *   topics/{topicId}                 { text, level, active }        — public read, admin-only write
 *   users/{uid}                      { displayName, email, joinedAt, lastSeenAt }
 *   users/{uid}/sessions/{auto}      one practice speech, see SessionRecord
 */

export interface SessionRecord {
  topicId: string;
  topicText: string;
  topicLevel: Level;
  chosenLevel: LevelChoice;
  prep: boolean;
  recorded: boolean;
  durationMs: number;
  verdict: Verdict;
}

export async function upsertProfile(user: User) {
  const joined = user.metadata.creationTime ? new Date(user.metadata.creationTime) : new Date();
  await setDoc(
    doc(db(), "users", user.uid),
    {
      displayName: user.displayName ?? "",
      email: user.email ?? "",
      joinedAt: Timestamp.fromDate(joined),
      lastSeenAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function saveSession(uid: string, record: SessionRecord) {
  await addDoc(collection(db(), "users", uid, "sessions"), {
    ...record,
    durationMs: Math.round(record.durationMs),
    createdAt: serverTimestamp(),
  });
}

/** Active topics from Firestore; empty if none have been seeded yet. */
export async function fetchTopics(): Promise<Topic[]> {
  const snap = await getDocs(query(collection(db(), "topics"), where("active", "==", true)));
  return snap.docs.map((d) => ({ id: d.id, text: String(d.get("text")), level: d.get("level") as Level }));
}
