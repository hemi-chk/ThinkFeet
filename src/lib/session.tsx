"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { topics as bundledTopics, type Topic, type Level } from "@/data/topics";
import { firebaseEnabled } from "@/lib/firebase";
import { fetchTopics } from "@/lib/records";

export type LevelChoice = Level | "unsure";

export interface SessionState {
  name: string;
  level: LevelChoice;
  prep: boolean;
  record: boolean;
  /** Chosen microphone's deviceId; empty means the browser default. */
  micId: string;
}

interface SessionCtx extends SessionState {
  /** Increments on every setSession, so the practice screen can start a fresh run. */
  runId: number;
  setSession: (s: SessionState) => void;
  pickTopic: () => Topic;
}

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({
    name: "",
    level: "beginner",
    prep: false,
    record: false,
    micId: "",
  });
  const [runId, setRunId] = useState(0);
  const used = useRef<Set<string>>(new Set());
  // The bundled list works offline and before Firestore is seeded; Firestore wins once it has topics.
  const [topics, setTopics] = useState<Topic[]>(bundledTopics);

  useEffect(() => {
    if (!firebaseEnabled) return;
    fetchTopics()
      .then((remote) => {
        if (remote.length) setTopics(remote);
      })
      .catch(() => {});
  }, []);

  const setSession = useCallback((s: SessionState) => {
    setState(s);
    setRunId((n) => n + 1);
    used.current = new Set();
  }, []);

  // Picks a random topic for the current level, avoiding repeats until the pool is exhausted.
  const pickTopic = useCallback(() => {
    const pool = topics.filter((t) => state.level === "unsure" || t.level === state.level);
    let avail = pool.filter((t) => !used.current.has(t.id));
    if (avail.length === 0) {
      pool.forEach((t) => used.current.delete(t.id));
      avail = pool;
    }
    const t = avail[Math.floor(Math.random() * avail.length)]!;
    used.current.add(t.id);
    return t;
  }, [state.level, topics]);

  const value = useMemo(() => ({ ...state, runId, setSession, pickTopic }), [state, runId, setSession, pickTopic]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSession must be used within SessionProvider");
  return c;
}
