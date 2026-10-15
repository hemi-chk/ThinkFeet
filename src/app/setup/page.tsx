import type { Metadata } from "next";
import { SetupForm } from "@/components/setup-form";

export const metadata: Metadata = {
  title: "Set up your practice",
  description: "Choose your name, speaking level and practice settings.",
};

export default function SetupPage() {
  return <SetupForm />;
}
