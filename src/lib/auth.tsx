"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth, firebaseEnabled } from "@/lib/firebase";
import { upsertProfile } from "@/lib/records";

interface AuthCtx {
  user: User | null;
  /** True until Firebase reports the initial auth state. */
  loading: boolean;
  enabled: boolean;
}

const Ctx = createContext<AuthCtx>({ user: null, loading: false, enabled: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(firebaseEnabled);

  useEffect(() => {
    if (!firebaseEnabled) return;
    return onAuthStateChanged(auth(), (u) => {
      setUser(u);
      setLoading(false);
      if (u) void upsertProfile(u).catch(() => {});
    });
  }, []);

  return <Ctx.Provider value={{ user, loading, enabled: firebaseEnabled }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

const EMAIL_KEY = "thinkfeet:signin-email";

export async function signInWithGoogle() {
  await signInWithPopup(auth(), new GoogleAuthProvider());
}

export async function signUpWithEmail(name: string, email: string, password: string) {
  const { user } = await createUserWithEmailAndPassword(auth(), email, password);
  await updateProfile(user, { displayName: name });
  await upsertProfile(user);
}

export async function signInWithEmail(email: string, password: string) {
  await signInWithEmailAndPassword(auth(), email, password);
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth(), email);
}

/** Emails a passwordless sign-in link that lands on /signin/finish. */
export async function sendMagicLink(email: string) {
  await sendSignInLinkToEmail(auth(), email, {
    url: `${window.location.origin}/signin/finish`,
    handleCodeInApp: true,
  });
  try {
    localStorage.setItem(EMAIL_KEY, email);
  } catch {
    /* storage blocked; the finish page will ask for the email */
  }
}

export function isMagicLink(href: string) {
  return isSignInWithEmailLink(auth(), href);
}

export function storedMagicLinkEmail() {
  try {
    return localStorage.getItem(EMAIL_KEY);
  } catch {
    return null;
  }
}

export async function completeMagicLink(email: string, href: string) {
  await signInWithEmailLink(auth(), email, href);
  try {
    localStorage.removeItem(EMAIL_KEY);
  } catch {
    /* ignore */
  }
}

export async function signOut() {
  await fbSignOut(auth());
}

/** Turns Firebase auth error codes into messages a user can act on. */
export function authErrorMessage(err: unknown) {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-email":
      return "That email address doesn't look right.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password is incorrect.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";
    case "auth/weak-password":
      return "Please use a password with at least 6 characters.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Please allow popups and try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/invalid-action-code":
    case "auth/expired-action-code":
      return "This sign-in link is invalid or has expired. Please request a new one.";
    default:
      return "Something went wrong. Please try again.";
  }
}
