"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { TOKENS } from "@/lib/design_system_lock";

interface GamifiedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "PRIMARY" | "GHOST" | "OUTLINE" | "EMERALD" | "ORANGE" | "RED" | "SECONDARY";
  size?: "SM" | "MD" | "LG" | "XL";
  glow?: boolean;
}

export const GamifiedButton: React.FC<GamifiedButtonProps> = ({
  children,
  className,
  variant = "PRIMARY",
  size = "MD",
  glow = true,
  ...props
}) => {
  const variantStyles = {
    PRIMARY: "bg-blue-600 text-white hover:bg-blue-500 border-blue-400/30",
    SECONDARY: "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700",
    EMERALD: "bg-emerald-600 text-white hover:bg-emerald-500 border-emerald-400/30",
    ORANGE: "bg-orange-600 text-white hover:bg-orange-500 border-orange-400/30",
    RED: "bg-red-600 text-white hover:bg-red-500 border-red-400/30",
    GHOST: "bg-transparent text-white/70 hover:bg-white/5 border-transparent",
    OUTLINE: "bg-transparent text-white border-slate-700 hover:border-blue-500/50 hover:bg-blue-500/5",
  };

  const sizeStyles = {
    SM: "px-4 py-2 text-xs",
    MD: "px-6 py-3 text-sm",
    LG: "px-8 py-4 text-base",
    XL: "px-10 py-5 text-lg font-black tracking-widest uppercase italic font-orbitron",
  };

  const accentColor = variant === "PRIMARY" ? TOKENS.COLORS.ACCENTS.PRIMARY : variant === "EMERALD" ? TOKENS.COLORS.ACCENTS.EMERALD : variant === "ORANGE" ? TOKENS.COLORS.ACCENTS.ORANGE : variant === "RED" ? TOKENS.COLORS.ACCENTS.RED : undefined;

  return (
    <button
      className={cn(
        "relative rounded-2xl border transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none group overflow-hidden",
        variantStyles[variant],
        sizeStyles[size],
        glow && accentColor && "hover:shadow-[0_0_20px_rgba(37,99,235,0.4)]",
        className
      )}
      style={glow && accentColor ? { boxShadow: `0 0 15px ${accentColor}30` } : undefined}
      {...props}
    >
      <div className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </div>
      
      {/* HUD Reflection Line */}
      <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </button>
  );
};
