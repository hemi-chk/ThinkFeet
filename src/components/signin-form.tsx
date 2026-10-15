"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  authErrorMessage,
  resetPassword,
  sendMagicLink,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  useAuth,
} from "@/lib/auth";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup" | "link";

const modes: { value: Mode; label: string }[] = [
  { value: "signin", label: "Sign in" },
  { value: "signup", label: "Sign up" },
  { value: "link", label: "Email link" },
];

const inputClass = "h-12 rounded-2xl border-2 bg-card px-4 text-base md:text-base focus-visible:border-primary";

export function SignInForm() {
  const { user, enabled } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  useEffect(() => {
    if (user) router.replace("/setup");
  }, [user, router]);

  if (!enabled) {
    return (
      <AuthCard title="Sign in is coming soon" subtitle="You can keep practising in public mode for now.">
        <Button asChild className="h-12 w-full rounded-full bg-gradient-primary text-base font-semibold shadow-glow">
          <Link href="/setup">Practise now →</Link>
        </Button>
      </AuthCard>
    );
  }

  const run = async (action: () => Promise<void>) => {
    setError("");
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && !name.trim()) return setError("Please enter your name.");
    void run(async () => {
      if (mode === "signin") await signInWithEmail(email, password);
      else if (mode === "signup") await signUpWithEmail(name.trim(), email, password);
      else {
        await sendMagicLink(email);
        setLinkSent(true);
      }
    });
  };

  const forgot = () => {
    if (!email) return setError("Enter your email above, then tap “Forgot password?” again.");
    void run(async () => {
      await resetPassword(email);
      toast.success("Password reset email sent.");
    });
  };

  if (linkSent) {
    return (
      <AuthCard title="Check your inbox 📬" subtitle={`We sent a sign-in link to ${email}. Open it on this device to finish signing in.`}>
        <Button variant="outline" className="h-12 w-full rounded-full" onClick={() => setLinkSent(false)}>
          Use a different email
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Welcome back!" subtitle="Sign in to save your speeches and track your progress.">
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => run(signInWithGoogle)}
        className="h-12 w-full gap-3 rounded-full border-2 bg-card text-base font-semibold hover:bg-muted"
      >
        <GoogleIcon />
        Continue with Google
      </Button>

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <div role="tablist" aria-label="Sign-in method" className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
        {modes.map((m) => (
          <button
            key={m.value}
            type="button"
            role="tab"
            aria-selected={mode === m.value}
            onClick={() => {
              setMode(m.value);
              setError("");
            }}
            className={cn(
              "rounded-full px-2 py-2 text-sm font-semibold transition-all",
              mode === m.value ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        {mode !== "link" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {mode === "signin" && (
                <button type="button" onClick={forgot} className="text-sm text-primary underline-offset-4 hover:underline">
                  Forgot password?
                </button>
              )}
            </div>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>
        )}
        {mode === "link" && (
          <p className="text-sm text-muted-foreground">We&apos;ll email you a link that signs you in — no password needed.</p>
        )}

        {error && (
          <p role="alert" className="rounded-2xl bg-danger-soft p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={busy}
          className="h-12 w-full rounded-full bg-gradient-primary text-base font-semibold shadow-glow transition-all hover:-translate-y-0.5"
        >
          {mode === "signin" ? "Sign in →" : mode === "signup" ? "Create account →" : "Send me a link →"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Just want to practise?{" "}
        <Link href="/setup" className="font-semibold text-foreground underline underline-offset-4">
          Continue without an account
        </Link>
      </p>
    </AuthCard>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
