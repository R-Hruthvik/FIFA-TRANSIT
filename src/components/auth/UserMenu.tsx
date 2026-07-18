"use client";

import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "motion/react";
import { LogOut, Shield, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect, useRef } from "react";

export function UserMenu() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-zinc-800 animate-pulse" />
        <div className="h-6 w-20 rounded bg-zinc-800 animate-pulse" />
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const user = session.user;
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email
        ? user.email[0].toUpperCase()
        : "U";

  const roleColors: Record<string, string> = {
    admin: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    staff: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    fan: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  };

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        className="relative h-9 w-9 rounded-full p-0 transition-colors hover:bg-zinc-800"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center font-black text-sm">
          {initials}
        </div>
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="user-menu"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-56 bg-zinc-950/95 border border-zinc-800 rounded-xl shadow-xl py-2 z-50"
          >
            <Card className="border-none bg-transparent shadow-none p-3">
              <CardContent className="pt-0">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center font-black">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{user.name || "User"}</p>
                    <p className="text-xs text-zinc-400 truncate">{user.email}</p>
                  </div>
                </div>
                <Badge className={roleColors[user.role] || roleColors.fan} variant="outline">
                  {user.role.toUpperCase()}
                </Badge>
              </CardContent>
            </Card>

            <div className="border-t border-zinc-800 my-2" />

            <Button
              variant="ghost"
              className="w-full justify-start gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-800"
              onClick={() => {
                setIsOpen(false);
                signOut({ callbackUrl: "/" });
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>

            {user.role === "admin" && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-800"
                asChild
                onClick={() => setIsOpen(false)}
              >
                <a href="/dashboard">
                  <Shield className="h-4 w-4" />
                  Admin Dashboard
                </a>
              </Button>
            )}

            {(user.role === "staff" || user.role === "admin") && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-800"
                asChild
                onClick={() => setIsOpen(false)}
              >
                <a href="/staff">
                  <LayoutDashboard className="h-4 w-4" />
                  Staff Dashboard
                </a>
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}