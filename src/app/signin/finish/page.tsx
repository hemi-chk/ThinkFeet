import type { Metadata } from "next";
import { FinishSignIn } from "@/components/finish-signin";

export const metadata: Metadata = {
  title: "Finishing sign in",
};

export default function FinishSignInPage() {
  return <FinishSignIn />;
}
