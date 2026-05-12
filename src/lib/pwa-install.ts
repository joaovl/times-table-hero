import { useEffect, useState, useCallback } from "react";

/**
 * PWA install-prompt hook.
 *
 * Listens for the browser's `beforeinstallprompt` event (Chrome / Edge /
 * Android), stashes the event, and exposes a `prompt()` function the UI can
 * call to show the native install dialog.
 *
 * Safari (iOS) does NOT fire this event — installing the PWA there requires
 * the user to use the Share -> "Add to Home Screen" menu manually. Callers
 * may want to detect iOS and show a hint, but that is out of scope here.
 *
 * Example wiring (to be done by a later agent — DO NOT add it here):
 *
 * ```tsx
 * // In src/pages/Hub.tsx (or wherever the menu lives)
 * import { useInstallPrompt } from "@/lib/pwa-install";
 *
 * function HubMenu() {
 *   const { canInstall, prompt } = useInstallPrompt();
 *   if (!canInstall) return null;
 *   return (
 *     <button onClick={prompt} className="...">
 *       Install app
 *     </button>
 *   );
 * }
 * ```
 */

// Minimal shape of the `beforeinstallprompt` event. Not in lib.dom yet.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface UseInstallPromptResult {
  /** True once the browser has offered an install prompt we can replay. */
  canInstall: boolean;
  /**
   * Trigger the native install dialog. Resolves to `true` if the user
   * accepted, `false` otherwise (including when no prompt is queued).
   */
  prompt: () => Promise<boolean>;
}

export function useInstallPrompt(): UseInstallPromptResult {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      // Stop Chrome from showing its own mini-infobar so the app controls UX.
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      // Once installed the event will not fire again for this session.
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const prompt = useCallback(async (): Promise<boolean> => {
    if (!deferred) return false;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    // The stashed event can only be used once.
    setDeferred(null);
    return choice.outcome === "accepted";
  }, [deferred]);

  return { canInstall: deferred !== null, prompt };
}
