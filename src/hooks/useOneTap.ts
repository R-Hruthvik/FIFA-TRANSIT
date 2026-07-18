"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";

interface PromptMomentNotification {
  isNotDisplayed: () => boolean;
  getNotDisplayedReason: () => string;
  isSkippedMoment: () => boolean;
  getSkippedReason: () => string;
  isDismissedMoment: () => boolean;
  getDismissedReason: () => string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: unknown) => void;
          prompt: (callback?: (notification: PromptMomentNotification) => void) => void;
          cancel: () => void;
        };
      };
    };
  }
}

export function useOneTap() {
  const { status } = useSession();
  const [configLoaded, setConfigLoaded] = useState(false);
  const [config, setConfig] = useState<{ enableOneTap: boolean; googleClientId: string } | null>(null);

  // Fetch feature flag + client ID
  useEffect(() => {
    let mounted = true;
    async function fetchConfig() {
      try {
        const res = await fetch("/api/config");
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) {
          setConfig({
            enableOneTap: !!data.featureFlags?.enableOneTap,
            googleClientId: data.googleClientId || "",
          });
          setConfigLoaded(true);
        }
      } catch (err) {
        console.error("Failed to load One Tap config:", err);
      }
    }
    fetchConfig();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!configLoaded || !config || !config.enableOneTap || !config.googleClientId) {
      return;
    }

    // Do not show One Tap if user is already logged in
    if (status === "loading" || status === "authenticated") {
      return;
    }

    const checkAndInitOneTap = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: config.googleClientId,
            callback: async (response: { credential?: string }) => {
              try {
                await signIn("google-one-tap", {
                  credential: response.credential,
                  redirect: false,
                });
                window.location.reload();
              } catch (err) {
                console.error("NextAuth One Tap sign-in error:", err);
              }
            },
            auto_select: true, // Auto sign-in returning users
            cancel_on_tap_outside: false,
          });

          window.google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed()) {
              console.log("One Tap not displayed:", notification.getNotDisplayedReason());
            } else if (notification.isSkippedMoment()) {
              console.log("One Tap skipped:", notification.getSkippedReason());
            } else if (notification.isDismissedMoment()) {
              console.log("One Tap dismissed:", notification.getDismissedReason());
            }
          });
        } catch (error) {
          console.error("Failed to initialize Google One Tap:", error);
        }
      }
    };

    // If script is already loaded, initialize directly
    if (window.google?.accounts?.id) {
      checkAndInitOneTap();
    } else {
      // Poll until window.google is ready (script is loaded via Script tag)
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          checkAndInitOneTap();
          clearInterval(interval);
        }
      }, 200);

      return () => {
        clearInterval(interval);
        if (window.google?.accounts?.id) {
          try {
            window.google.accounts.id.cancel();
          } catch {}
        }
      };
    }
  }, [configLoaded, config, status]);

  const showOneTap = !!(configLoaded && config && config.enableOneTap && config.googleClientId && status !== "loading" && status !== "authenticated");
  return { showOneTap, googleClientId: config?.googleClientId || "" };
}

