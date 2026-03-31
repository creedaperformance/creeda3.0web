"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LineChart, ClipboardList, User, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { HUDLabel } from "./HUDLabel";

const NAV_ITEMS = [
  { label: "Dashboard", icon: Home, href: "/athlete/dashboard" },
  { label: "Daily Check-In", icon: ClipboardList, href: "/athlete/checkin" },
  { label: "Intelligence", icon: LineChart, href: "/athlete/readiness" },
  { label: "Athlete Profile", icon: User, href: "/athlete/onboarding" },
  { label: "System Settings", icon: Settings, href: "/athlete/settings" },
];

export const DesktopSidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 border-r border-slate-800 bg-slate-950/50 backdrop-blur-xl z-50 p-6 overflow-y-auto">
      <div className="mb-10">
        <h1 className="text-2xl font-black italic text-blue-500 font-orbitron tracking-tighter uppercase">
          Creeda<span className="text-white">OS</span>
        </h1>
        <div className="mt-1 h-px w-full bg-gradient-to-r from-blue-500/50 to-transparent" />
      </div>

      <nav className="flex-1 space-y-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center px-4 py-3 rounded-lg transition-all border border-transparent",
                isActive 
                  ? "bg-blue-500/10 border-blue-500/20 text-white" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center mr-3 transition-all",
                isActive ? "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" : "bg-slate-900 group-hover:bg-slate-800"
              )}>
                <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-slate-500")} />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest font-orbitron">
                {item.label}
              </span>
              {isActive && (
                <div className="ml-auto w-1 h-4 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="pt-6 mt-6 border-t border-slate-800 space-y-4">
        <HUDLabel index="00" label="Operator Session" />
        <Link 
          href="/login"
          className="flex items-center text-slate-500 hover:text-red-400 text-xs font-bold uppercase tracking-widest font-orbitron transition-colors w-full px-4 py-2 hover:bg-red-500/5 rounded-lg"
        >
          <LogOut className="w-4 h-4 mr-3" />
          Terminate Session
        </Link>
      </div>
    </aside>
  );
};
