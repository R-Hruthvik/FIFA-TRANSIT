"use client";

import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

function LoginFormSuspense() {
  return <LoginForm />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="h-8 w-8 animate-spin text-emerald-400" /></div>}>
      <LoginFormSuspense />
    </Suspense>
  );
}