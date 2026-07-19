"use client";

import { useSession, signIn } from "next-auth/react";
import { useState } from "react";
import { useStaffStatus } from "@/hooks/useStaffStatus";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, ShieldCheck, UserCheck, Timer, Prohibit } from "@phosphor-icons/react";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function StaffRegisterPage() {
  const { data: session, status: authStatus } = useSession();
  const { staffStatus, isLoading: statusLoading } = useStaffStatus();

  const [formData, setFormData] = useState({
    staffId: "",
    organization: "",
    role: "steward",
    reason: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/staff/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit registration");
      }

      // Reloading will trigger the useStaffStatus hook status update
      window.location.reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authStatus === "loading" || (authStatus === "authenticated" && statusLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <p className="text-zinc-400 text-sm font-medium tracking-wider">CHECKING APPLICATION STATUS...</p>
        </div>
      </div>
    );
  }

  // Case 1: Unauthenticated
  if (authStatus === "unauthenticated") {
    return (
      <main className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-zinc-950 via-[#01170f] to-zinc-950 text-white p-6 relative">
        <StadiumBackground />
        <Card className="max-w-md w-full relative z-10 bg-zinc-900/40 border-white/10 backdrop-blur-md">
          <CardHeader className="text-center">
            <div className="mx-auto p-4 bg-emerald-600/10 rounded-2xl w-fit border border-emerald-500/20 mb-4">
              <ShieldCheck size={48} weight="duotone" className="text-emerald-400" />
            </div>
            <CardTitle className="text-2xl font-black tracking-wider uppercase text-white">
              STAFF PORTAL
            </CardTitle>
            <CardDescription className="text-zinc-400 text-sm mt-2">
              Apply for credentials to access the operational command suite
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-zinc-400 text-sm leading-relaxed text-center font-light">
              Access to live stadium telemetry, spatial heatmaps, and tactical recommendations is restricted to approved department personnel.
            </p>
            <Button
              onClick={() => signIn(undefined, { callbackUrl: "/staff/register" })}
              className="w-full py-6 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]"
            >
              Sign In to Register
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Case 2: Pending
  if (staffStatus === "pending") {
    return (
      <main className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-zinc-950 via-[#01170f] to-zinc-950 text-white p-6 relative">
        <StadiumBackground />
        <Card className="max-w-md w-full relative z-10 bg-zinc-900/40 border-white/10 backdrop-blur-md">
          <CardHeader className="text-center">
            <div className="mx-auto p-4 bg-amber-500/10 rounded-2xl w-fit border border-amber-500/20 mb-4">
              <Timer size={48} weight="duotone" className="text-amber-400 animate-pulse" />
            </div>
            <CardTitle className="text-2xl font-black tracking-wider uppercase text-white">
              APPLICATION PENDING
            </CardTitle>
            <CardDescription className="text-zinc-400 text-sm mt-2">
              Your credentials request is under review
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-zinc-400 text-sm leading-relaxed font-light">
              Your staff application is currently in the queue. An administrator will verify your details against stadium records. This page will auto-update on approval.
            </p>
            <div className="flex justify-center gap-2">
              <Badge variant="secondary" className="px-4 py-2 gap-2 text-xs font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                POLLING STATUS
              </Badge>
            </div>
            <Button
              asChild
              variant="outline"
              className="w-full border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <Link href="/">Back to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Case 3: Approved
  if (staffStatus === "approved") {
    return (
      <main className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-zinc-950 via-[#01170f] to-zinc-950 text-white p-6 relative">
        <StadiumBackground />
        <Card className="max-w-md w-full relative z-10 bg-zinc-900/40 border-white/10 backdrop-blur-md">
          <CardHeader className="text-center">
            <div className="mx-auto p-4 bg-emerald-600/10 rounded-2xl w-fit border border-emerald-500/20 mb-4">
              <UserCheck size={48} weight="duotone" className="text-emerald-400" />
            </div>
            <CardTitle className="text-2xl font-black tracking-wider uppercase text-white">
              ACCESS APPROVED
            </CardTitle>
            <CardDescription className="text-zinc-400 text-sm mt-2">
              Your staff credentials have been verified
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-zinc-400 text-sm leading-relaxed font-light">
              Welcome to the operations team! You now have access to the Staff Hub dashboard, heatmaps, and tactical commands.
            </p>
            <Button
              asChild
              className="w-full py-6 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl tracking-widest uppercase transition-all"
            >
              <Link href="/">Launch Command Center</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Case 4: Rejected
  if (staffStatus === "rejected") {
    return (
      <main className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-zinc-950 via-[#01170f] to-zinc-950 text-white p-6 relative">
        <StadiumBackground />
        <Card className="max-w-md w-full relative z-10 bg-zinc-900/40 border-white/10 backdrop-blur-md">
          <CardHeader className="text-center">
            <div className="mx-auto p-4 bg-red-500/10 rounded-2xl w-fit border border-red-500/20 mb-4">
              <Prohibit size={48} weight="duotone" className="text-red-400" />
            </div>
            <CardTitle className="text-2xl font-black tracking-wider uppercase text-white">
              APPLICATION REJECTED
            </CardTitle>
            <CardDescription className="text-zinc-400 text-sm mt-2">
              Access request denied
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-zinc-400 text-sm leading-relaxed font-light">
              Your credentials could not be verified against official records. Please contact the Operations Admin if you believe this is an error.
            </p>
            <Button
              asChild
              variant="outline"
              className="w-full border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <Link href="/">Back to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Case 5: None — Show Registration Form
  return (
    <main className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-zinc-950 via-[#01170f] to-zinc-950 text-white p-6 relative">
      <StadiumBackground />
      <Card className="max-w-lg w-full relative z-10 bg-zinc-900/40 border-white/10 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-xl font-black tracking-wider uppercase text-white">
            STAFF REGISTRATION
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Submit your details to request operational permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-mono uppercase tracking-wider">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">
                Staff ID (issued by Stadium Department)
              </label>
              <input
                type="text"
                required
                value={formData.staffId}
                onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                placeholder="ST-XXXX-2026"
                className="w-full bg-zinc-950/60 border border-zinc-800 focus:border-emerald-500/50 px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">
                  Organization / Department
                </label>
                <input
                  type="text"
                  required
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  placeholder="Security Ops / Logistics"
                  className="w-full bg-zinc-950/60 border border-zinc-800 focus:border-emerald-500/50 px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">
                  Assigned Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-zinc-950/60 border border-zinc-800 focus:border-emerald-500/50 px-4 py-3 rounded-xl text-sm focus:outline-none transition-all appearance-none text-white"
                >
                  <option value="steward" className="bg-zinc-950">Steward</option>
                  <option value="security" className="bg-zinc-950">Security Officer</option>
                  <option value="logistics" className="bg-zinc-950">Logistics Coordinator</option>
                  <option value="stadium_ops" className="bg-zinc-950">Stadium Operator</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">
                Access Justification / Reason
              </label>
              <textarea
                required
                rows={3}
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Explain why you require credentials to view real-time maps and query logs..."
                className="w-full bg-zinc-950/60 border border-zinc-800 focus:border-emerald-500/50 px-4 py-3 rounded-xl text-sm focus:outline-none transition-all resize-none"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-6 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black rounded-xl tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  SUBMITTING APPLICATION...
                </span>
              ) : (
                "Submit Credentials Application"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

function StadiumBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[600px] bg-gradient-to-b from-emerald-500/5 via-zinc-950/20 to-transparent" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[300px]" />
    </div>
  );
}
