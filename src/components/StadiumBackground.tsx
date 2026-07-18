"use client";

import { useState, useEffect } from "react";
import { getAllBgImages } from "@/lib/bg-images";

const FIRST_BG = getAllBgImages()[0];

function StadiumBackground() {
  const [bg, setBg] = useState(FIRST_BG);

  useEffect(() => {
    // Randomize only on client after mount — avoids SSR hydration mismatch
    setBg(getAllBgImages()[Math.floor(Math.random() * getAllBgImages().length)]);
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.08]"
        style={{ backgroundImage: `url('${bg}')` }}
      />
      <div className="absolute top-0 left-0 right-0 h-[600px] bg-gradient-to-b from-emerald-500/5 via-zinc-950/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-[400px] bg-gradient-to-t from-amber-500/5 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[300px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[300px]" />
    </div>
  );
}

export default StadiumBackground;
