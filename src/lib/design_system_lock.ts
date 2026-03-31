/**
 * CREEDA DESIGN SYSTEM LOCK
 * Version: 1.0 (Gold Standard)
 * 
 * This file freezes the core aesthetic tokens of the Creeda platform.
 * Any UI changes to these tokens must go through a formal override process.
 */

export const DESIGN_LOCK = {
  VERSION: "1.0",
  LAST_SYNC: "2026-03-28",
  AESTHETIC: "GAMIFIED_HUD",
  THEME_STATUS: "LOCKED",
};

export const TOKENS = {
  COLORS: {
    BACKGROUND: {
      DEFAULT: "#020617", // Slate 950
      SECONDARY: "#0F172A", // Slate 900
      GLASS: "rgba(15, 23, 42, 0.7)",
    },
    ACCENTS: {
      PRIMARY: "#2563eb", // Gold Standard Blue
      EMERALD: "#10b981", // Optimal / Success
      ORANGE: "#f97316", // Moderate Risk / Alert
      RED: "#ef4444", // High Risk / Error
    },
    TEXT: {
      HEADER: "#FFFFFF",
      BODY: "#94A3B8", // Slate 400
      MUTED: "#64748B", // Slate 500
    },
    BORDER: {
      DEFAULT: "#1E293B", // Slate 800
      ACTIVE: "#2563eb",
      ALERT: "rgba(249, 115, 22, 0.5)",
    }
  },
  TYPOGRAPHY: {
    HEADER_FONT: "var(--font-orbitron)",
    BODY_FONT: "var(--font-geist-sans)",
    HEADER_WEIGHT: "900",
    BODY_WEIGHT: "400",
    LETTER_SPACING_HEADER: "-0.05em",
    LETTER_SPACING_HUD: "0.2em",
  },
  SPACING: {
    RADIUS_CARD: "2rem",
    RADIUS_BUTTON: "1rem",
    GAP_DASHBOARD: "2rem",
  },
  EFFECTS: {
    GLOW_PRIMARY: "0 0 20px rgba(37, 99, 235, 0.3)",
    GLOW_EMERALD: "0 0 20px rgba(16, 185, 129, 0.3)",
    GLOW_ORANGE: "0 0 20px rgba(249, 115, 22, 0.3)",
  }
};

/**
 * Design Override Hook (For future expansion ONLY)
 * Use case: Explicit role-based overrides if absolutely necessary.
 */
export const validateUIChange = (tokenKey: string, overrideFlag: boolean = false) => {
  if (!overrideFlag) {
    console.warn(`[DESIGN_LOCK] Attempted to modify ${tokenKey} without override flag. Reverting to Gold Standard.`);
    return false;
  }
  return true;
};
