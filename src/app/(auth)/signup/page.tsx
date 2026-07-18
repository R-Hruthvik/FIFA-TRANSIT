"use client";

import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <div className="min-h-screen w-full overflow-hidden flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <SignupForm />
    </div>
  );
}