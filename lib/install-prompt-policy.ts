/**
 * Pure policy for deciding when to surface the install prompt.
 *
 * Kept browser-API-free so it can be unit-tested with node:test without a
 * DOM. The component in `components/InstallPrompt.tsx` reads localStorage
 * and `display-mode` and feeds the values into `shouldShowInstallPrompt`.
 */

export const DISMISS_COOLDOWN_DAYS = 14;
export const MIN_VISITS = 2;
export const MIN_ENGAGEMENT = 1;
export const DAY_MS = 24 * 60 * 60 * 1000;

export const STORAGE_KEYS = {
  dismissedAt: "kurimasense:install-dismissed-at",
  installed: "kurimasense:installed",
  visitCount: "kurimasense:visit-count",
  engagementScore: "kurimasense:engagement-score",
} as const;

export const SESSION_KEY_VISIT_COUNTED = "kurimasense:visit-counted";

export type InstallPromptPolicyInput = {
  /** From `matchMedia('(display-mode: standalone)')` or iOS `navigator.standalone`. */
  isStandalone: boolean;
  /** From localStorage flag we set after a successful Android/desktop install. */
  hasInstalledFlag: boolean;
  /** Sessions counted via sessionStorage marker; 0 on very first visit. */
  visitCount: number;
  /** Count of "key actions" — logging an activity, etc. */
  engagementScore: number;
  /** Timestamp (ms) of the user's last "Not now". `null` if never dismissed. */
  dismissedAt: number | null;
  /** Current time in ms — injected for testability. */
  now: number;
};

export function shouldShowInstallPrompt(input: InstallPromptPolicyInput): boolean {
  if (input.isStandalone || input.hasInstalledFlag) return false;

  if (input.dismissedAt !== null) {
    const cooldownMs = DISMISS_COOLDOWN_DAYS * DAY_MS;
    if (input.now - input.dismissedAt < cooldownMs) return false;
  }

  return (
    input.visitCount >= MIN_VISITS ||
    input.engagementScore >= MIN_ENGAGEMENT
  );
}
