"use client";

import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

function LoginFormSuspense() {
  return <LoginForm />;
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full overflow-hidden flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="h-8 w-8 animate-spin text-emerald-400" /></div>}>
        <LoginFormSuspense />
      </Suspense>
    </div>
  );
}