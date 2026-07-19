import { cn } from "@/lib/utils";

function SkeletonPulse({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-zinc-800/40", className)}
      {...props}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-4 p-6 rounded-xl border border-zinc-800/60 bg-zinc-900/20">
          <div className="flex items-center gap-3">
            <SkeletonPulse className="w-2 h-2 rounded-full" />
            <SkeletonPulse className="h-3 w-28" />
          </div>
          <SkeletonPulse className="h-3 w-full" />
          <SkeletonPulse className="h-3 w-3/4" />
        </div>
        <div className="flex flex-col gap-4 p-6 rounded-xl border border-zinc-800/60 bg-zinc-900/20">
          <div className="flex items-center gap-3">
            <SkeletonPulse className="w-2 h-2 rounded-full" />
            <SkeletonPulse className="h-3 w-32" />
          </div>
          <SkeletonPulse className="h-3 w-full" />
          <SkeletonPulse className="h-3 w-2/3" />
        </div>
      </div>

      <div className="flex flex-col gap-3 p-6 rounded-xl border border-zinc-800/60 bg-zinc-900/20">
        <div className="flex items-center gap-3">
          <SkeletonPulse className="w-2 h-2 rounded-full" />
          <SkeletonPulse className="h-3 w-36" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <SkeletonPulse className="h-20 rounded-lg" />
          <SkeletonPulse className="h-20 rounded-lg" />
          <SkeletonPulse className="h-20 rounded-lg" />
        </div>
      </div>

      <div className="flex flex-col gap-4 p-6 rounded-xl border border-zinc-800/60 bg-zinc-900/20">
        <div className="flex items-center gap-3">
          <SkeletonPulse className="h-3 w-24" />
          <SkeletonPulse className="h-5 w-10 rounded-md" />
        </div>
        <SkeletonPulse className="h-3 w-full" />
        <SkeletonPulse className="h-3 w-1/2" />
        <SkeletonPulse className="h-10 w-full rounded-xl" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-4 p-6 rounded-xl border border-zinc-800/60 bg-zinc-900/20">
          <SkeletonPulse className="h-3 w-28" />
          <SkeletonPulse className="h-3 w-full" />
          <SkeletonPulse className="h-3 w-5/6" />
        </div>
        <div className="flex flex-col gap-4 p-6 rounded-xl border border-zinc-800/60 bg-zinc-900/20 min-h-[600px]">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800/60">
            <div className="flex items-center gap-3">
              <SkeletonPulse className="w-2 h-2 rounded-full" />
              <SkeletonPulse className="h-3 w-28" />
            </div>
            <SkeletonPulse className="h-5 w-24 rounded-md" />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <SkeletonPulse className="h-40 w-40 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default SkeletonPulse;
