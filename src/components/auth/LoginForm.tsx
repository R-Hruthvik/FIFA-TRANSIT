"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Loader2, Eye, EyeOff, KeyRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const errorParam = searchParams.get("error");
  const registered = searchParams.get("registered");

  if (errorParam && !error) {
    setError(errorParam);
  }

  if (registered && !error) {
    setError("Account created successfully! Please sign in.");
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("admin-credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl });
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-zinc-900 border-zinc-700/30 shadow-xl backdrop-blur-sm">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-3">
          <KeyRound className="h-6 w-6 text-emerald-400" />
        </div>
        <CardTitle className="text-2xl font-black tracking-widest text-white uppercase">
          SIGN IN
        </CardTitle>
        <p className="text-emerald-400 text-sm mt-1">
          Access the FIFA Transit Operations Center
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg"
            >
              {error}
            </motion.div>
          )}

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@fifa.org"
            required
            disabled={isLoading}
            className="focus-visible:border-emerald-500 focus-visible:ring-1 focus-visible:ring-emerald-500"
          />

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-zinc-200">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isLoading}
                className="w-full h-10 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:border-emerald-500 focus-visible:ring-1 focus-visible:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full py-3 text-sm font-black tracking-wider bg-amber-600 hover:bg-amber-500 text-zinc-950 hover:text-zinc-950 font-bold border-none transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing In...
              </>
            ) : (
              "SIGN IN"
            )}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-zinc-950/50 px-4 text-zinc-400 font-medium tracking-wider">
              Or continue with
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full py-3 text-sm font-medium"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>

        <div className="mt-6 text-center">
          <p className="text-zinc-400 text-sm">
            Don&apos;t have an account?{" "}
            <a
              href="/signup"
              className="text-amber-400 hover:text-amber-300 font-medium underline-offset-2 hover:underline"
            >
              Create Account
            </a>
          </p>
          <p className="text-zinc-400 text-xs mt-2">
            <a
              href="/admin-login"
              className="hover:text-zinc-300 underline-offset-2 hover:underline"
            >
              Staff/Admin sign in →
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}