"use client";

import React from "react";

interface HUDLayoutWrapperProps {
  children: React.ReactNode;
}

// Simplified: The old HUD sidebar/bottom-tab navigation is now handled by
// DashboardLayout (per-page) and BottomNav (global mobile).
// This wrapper is kept for backward compatibility with existing layouts.
export const HUDLayoutWrapper: React.FC<HUDLayoutWrapperProps> = ({ children }) => {
  return <>{children}</>;
};
