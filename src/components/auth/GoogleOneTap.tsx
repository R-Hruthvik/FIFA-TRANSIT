"use client";

import Script from "next/script";
import { useOneTap } from "@/hooks/useOneTap";

export default function GoogleOneTap() {
  const { showOneTap, googleClientId } = useOneTap();

  if (!showOneTap) return null;

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
      />
      {/* Container required for rendering the One Tap dialog */}
      <div
        id="g_id_onload"
        data-client_id={googleClientId}
        className="fixed top-4 right-4 z-50 pointer-events-none"
      />
    </>
  );
}

