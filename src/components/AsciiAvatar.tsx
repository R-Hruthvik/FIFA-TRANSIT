"use client";

type Persona = "miri" | "torque";
type AvatarState = "idle" | "thinking" | "excited" | "alert";

const LABELS: Record<Persona, Record<AvatarState, string>> = {
  miri: {
    idle: "[ MIRI - LISTENING ]\n\n  ◕‿◕\n  ready when you are!",
    thinking: "[ MIRI - PROCESSING ]\n\n  (⊙_⊙)\n  let me check the feed...",
    excited: "[ MIRI - HYPED ]\n\n  ╰(◕‿◕)╯\n  LET'S GOOOO!",
    alert: "[ MIRI - ATTENTION ]\n\n  (⊙＿⊙)\n  hey! heads-up!",
  },
  torque: {
    idle: "[ TORQUE - STANDBY ]\n\n  ╭(─_─)╮\n  awaiting orders, chief.",
    thinking: "[ TORQUE - PROCESSING ]\n\n  (￣ ￣)\n  crunching ops numbers...",
    excited: "[ TORQUE - OPTIMAL ]\n\n  ᕦ(ò_ó)ᕤ\n  tactical advantage locked.",
    alert: "[ TORQUE - ALPHA ]\n\n  ⚠(≧_≦)⚠\n  flag on the field!",
  },
};

export function AsciiAvatar({
  persona = "miri",
  state = "idle",
}: {
  persona?: Persona;
  state?: AvatarState;
}) {
  return (
    <pre className="font-mono text-center text-xs tracking-tighter text-emerald-400 select-none bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl min-h-[120px] flex items-center justify-center">
      {LABELS[persona][state]}
    </pre>
  );
}
