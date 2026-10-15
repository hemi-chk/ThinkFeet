"use client";

import Link from "next/link";
import { toast } from "sonner";
import { signOut, useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

/** "sign in" link, or a greeting with sign out once the user is signed in. */
export function AccountLink({ className }: { className?: string }) {
  const { user, loading } = useAuth();
  if (loading) return <span className={cn("opacity-0", className)}>sign in</span>;
  if (!user) {
    return (
      <Link href="/signin" className={cn("font-semibold underline underline-offset-4", className)}>
        sign in
      </Link>
    );
  }
  const first = (user.displayName || user.email || "there").split(/[\s@]/)[0];
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      Hi, <span className="font-semibold">{first}</span>
      <span aria-hidden>·</span>
      <button
        type="button"
        onClick={() => signOut().then(() => toast("Signed out"))}
        className="font-semibold underline underline-offset-4"
      >
        sign out
      </button>
    </span>
  );
}

/** Tells the user whether their speeches are being saved. */
export function ModeBadge({ className }: { className?: string }) {
  const { user, loading } = useAuth();
  return (
    <span className={cn("rounded-full bg-card/70 px-4 py-1 text-sm font-medium", loading && "opacity-0", className)}>
      {user ? "✓ history on" : "public mode"}
    </span>
  );
}
