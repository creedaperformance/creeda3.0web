"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LineChart, ClipboardList, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Home", icon: Home, href: "/dashboard" },
  { label: "Logs", icon: ClipboardList, href: "/logs" },
  { label: "Insights", icon: LineChart, href: "/insights" },
  { label: "Profile", icon: User, href: "/profile" },
];

export const BottomTab: React.FC = () => {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 h-20 md:hidden bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none">
      <nav className="glass-hud border-t border-slate-700/50 rounded-2xl flex items-center justify-around h-16 pointer-events-auto overflow-hidden">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full transition-all relative",
                isActive ? "text-blue-500" : "text-slate-500 hover:text-slate-300"
              )}
            >
              {isActive && (
                <div className="absolute top-0 w-8 h-1 bg-blue-500 rounded-full glow-blue" />
              )}
              <Icon className={cn("w-6 h-6 mb-1 transition-transform", isActive && "scale-110")} />
              <span className="text-[10px] font-bold uppercase tracking-wider font-orbitron">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
