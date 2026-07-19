"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, Lock } from "lucide-react";
import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("fan" | "staff" | "admin")[];
  fallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  allowedRoles = ["fan", "staff", "admin"],
  fallback,
}: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const serializedRoles = allowedRoles.join(",");

  useEffect(() => {
    if (status === "unauthenticated") {
      const path = window.location.pathname;
      if (path !== "/login" && path !== "/admin-login" && path !== "/signup") {
        router.push("/login");
      }
    } else if (status === "authenticated" && session?.user?.role) {
      const userRole = session.user.role;
      if (!allowedRoles.includes(userRole)) {
        router.push("/");
      }
    }
  }, [session, status, router, serializedRoles]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <p className="text-zinc-400 text-sm font-medium tracking-wider">
            Verifying access...
          </p>
        </motion.div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center">
                <Lock className="h-8 w-8 text-zinc-500" />
              </div>
              <h3 className="text-xl font-black tracking-widest text-white mb-2">
                AUTHENTICATION REQUIRED
              </h3>
              <p className="text-zinc-400 mb-6">
                Please sign in to access this page.
              </p>
              <a
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-zinc-950 font-black text-sm tracking-wider rounded-lg hover:bg-emerald-400 transition-colors"
              >
                Sign In
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (session?.user?.role && !allowedRoles.includes(session.user.role)) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center">
                <Lock className="h-8 w-8 text-zinc-500" />
              </div>
              <h3 className="text-xl font-black tracking-widest text-white mb-2">
                ACCESS DENIED
              </h3>
              <p className="text-zinc-400 mb-6">
                You don&apos;t have permission to access this page. Required role:
                <span className="font-mono text-emerald-400 ml-1">
                  {allowedRoles.join(" / ")}
                </span>
              </p>
              <a
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-800 text-white font-medium text-sm rounded-lg hover:bg-zinc-700 transition-colors"
              >
                Go to Dashboard
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}