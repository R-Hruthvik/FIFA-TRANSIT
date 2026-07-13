export interface IGateStatusClasses {
  bg: string;
  border: string;
  dot: string;
  bar: string;
  text: string;
}

export const STATUS_CLASSES: Record<string, IGateStatusClasses> = {
  low: {
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/20",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    text: "text-emerald-400",
  },
  medium: {
    bg: "bg-amber-500/5",
    border: "border-amber-500/20",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    text: "text-amber-400",
  },
  high: {
    bg: "bg-rose-500/5",
    border: "border-rose-500/30",
    dot: "bg-rose-500 animate-pulse",
    bar: "bg-rose-500",
    text: "text-rose-400",
  },
};

export const COLOR_MAP: Record<string, string> = {
  success: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  warning: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  info: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  critical: "text-rose-400 bg-rose-500/10 border-rose-500/20",
};
