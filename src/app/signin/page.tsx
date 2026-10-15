import type { Metadata } from "next";
import { SignInForm } from "@/components/signin-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to save your practice history and track your progress.",
};

export default function SignInPage() {
  return <SignInForm />;
}
