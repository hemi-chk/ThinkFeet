"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from "@/lib/firebase";
import { authErrorMessage, completeMagicLink, isMagicLink, storedMagicLinkEmail, useAuth } from "@/lib/auth";

type State = "working" | "need-email" | "invalid" | "error";

/** Landing page for the passwordless email link (see sendMagicLink). */
export function FinishSignIn() {
  const { enabled } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<State>("working");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const started = useRef(false);

  const finish = async (address: string) => {
    try {
      await completeMagicLink(address, window.location.href);
      router.replace("/setup");
    } catch (err) {
      setError(authErrorMessage(err));
      setState("error");
    }
  };

  useEffect(() => {
    if (!enabled || started.current) return;
    started.current = true;
    void (async () => {
      await auth().authStateReady();
      if (!isMagicLink(window.location.href)) return setState("invalid");
      // Opened on a different device or browser: we don't know the email, so ask for it.
      const saved = storedMagicLinkEmail();
      if (saved) await finish(saved);
      else setState("need-email");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setState("working");
    void finish(email);
  };

  if (state === "need-email") {
    return (
      <AuthCard title="Confirm your email" subtitle="For security, enter the email address you requested the link with.">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-2xl border-2 bg-card px-4 text-base md:text-base focus-visible:border-primary"
            />
          </div>
          <Button type="submit" className="h-12 w-full rounded-full bg-gradient-primary text-base font-semibold shadow-glow">
            Sign in →
          </Button>
        </form>
      </AuthCard>
    );
  }

  if (state === "invalid" || state === "error" || !enabled) {
    return (
      <AuthCard
        title="That link didn't work"
        subtitle={error || "This sign-in link is invalid or has already been used. Please request a new one."}
      >
        <Button asChild className="h-12 w-full rounded-full bg-gradient-primary text-base font-semibold shadow-glow">
          <Link href="/signin">Back to sign in</Link>
        </Button>
      </AuthCard>
    );
  }

  return <AuthCard title="Signing you in…" subtitle="Just a moment." />;
}
