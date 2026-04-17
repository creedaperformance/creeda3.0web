export const COOKIE_NOTICE_KEY = "creeda_cookie_notice_v2";
export const COOKIE_CONSENT_EVENT = "creeda:cookie-consent";

export type ConsentChoice = "accepted_all" | "essential_only";

export function persistCookieChoice(choice: ConsentChoice) {
  try {
    localStorage.setItem(COOKIE_NOTICE_KEY, choice);
    window.dispatchEvent(
      new CustomEvent(COOKIE_CONSENT_EVENT, { detail: { choice } }),
    );
  } catch {
    // Ignore storage failures and keep UX resilient.
  }
}

export function subscribeToCookieChoice(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const listener = () => onStoreChange();

  window.addEventListener("storage", listener);
  window.addEventListener(COOKIE_CONSENT_EVENT, listener as EventListener);

  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(
      COOKIE_CONSENT_EVENT,
      listener as EventListener,
    );
  };
}

export function getCookieChoiceSnapshot(): ConsentChoice | null {
  if (typeof window === "undefined") return null;

  try {
    const storedValue = localStorage.getItem(COOKIE_NOTICE_KEY);
    if (storedValue === "accepted_all" || storedValue === "essential_only") {
      return storedValue;
    }
  } catch {
    return null;
  }

  return null;
}

export function getCookieChoiceServerSnapshot(): ConsentChoice | null {
  return null;
}
