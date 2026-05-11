import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  DAY_MS,
  DISMISS_COOLDOWN_DAYS,
  MIN_VISITS,
  shouldShowInstallPrompt,
  type InstallPromptPolicyInput,
} from "../lib/install-prompt-policy.ts";

const NOW = new Date("2026-01-15T12:00:00Z").getTime();

function input(overrides: Partial<InstallPromptPolicyInput> = {}): InstallPromptPolicyInput {
  return {
    isStandalone: false,
    hasInstalledFlag: false,
    visitCount: 0,
    engagementScore: 0,
    dismissedAt: null,
    now: NOW,
    ...overrides,
  };
}

describe("shouldShowInstallPrompt", () => {
  it("does not show on the very first visit", () => {
    assert.equal(shouldShowInstallPrompt(input({ visitCount: 1 })), false);
  });

  it("shows once visitCount reaches the threshold", () => {
    assert.equal(MIN_VISITS, 2, "test assumes MIN_VISITS=2");
    assert.equal(shouldShowInstallPrompt(input({ visitCount: 2 })), true);
    assert.equal(shouldShowInstallPrompt(input({ visitCount: 5 })), true);
  });

  it("shows on first visit when engagement is non-zero", () => {
    assert.equal(
      shouldShowInstallPrompt(input({ visitCount: 1, engagementScore: 1 })),
      true,
    );
  });

  it("stays hidden while inside the 14-day dismissal cooldown", () => {
    const oneDayAgo = NOW - 1 * DAY_MS;
    assert.equal(
      shouldShowInstallPrompt(input({ visitCount: 10, dismissedAt: oneDayAgo })),
      false,
    );

    const thirteenDaysAgo = NOW - 13 * DAY_MS;
    assert.equal(
      shouldShowInstallPrompt(input({ visitCount: 10, dismissedAt: thirteenDaysAgo })),
      false,
    );
  });

  it("re-emerges once the dismissal cooldown elapses", () => {
    assert.equal(DISMISS_COOLDOWN_DAYS, 14, "test assumes 14-day cooldown");
    const fifteenDaysAgo = NOW - 15 * DAY_MS;
    assert.equal(
      shouldShowInstallPrompt(input({ visitCount: 10, dismissedAt: fifteenDaysAgo })),
      true,
    );
  });

  it("never shows once the app is installed", () => {
    assert.equal(
      shouldShowInstallPrompt(input({ visitCount: 100, hasInstalledFlag: true })),
      false,
    );
    assert.equal(
      shouldShowInstallPrompt(input({ visitCount: 100, isStandalone: true })),
      false,
    );
  });

  it("ignores engagement / visits when standalone is detected", () => {
    assert.equal(
      shouldShowInstallPrompt(
        input({ isStandalone: true, visitCount: 99, engagementScore: 99 }),
      ),
      false,
    );
  });
});
