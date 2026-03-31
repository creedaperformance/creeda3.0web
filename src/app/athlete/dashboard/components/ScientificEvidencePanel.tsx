"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BrainCircuit,
  FlaskConical,
  MoonStar,
  Pill,
  ShieldCheck,
  Target,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";

import type { AthleteScientificContext } from "@/lib/engine/Prescription/AthleteScienceContext";

interface Props {
  context: AthleteScientificContext;
}

export const ScientificEvidencePanel: React.FC<Props> = ({ context }) => {
  if (!context) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.18 }}
      className="rounded-3xl bg-white/[0.02] border border-white/[0.06] p-5 sm:p-6 space-y-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
            Sports Science Backing
          </p>
          <h2 className="text-lg sm:text-xl font-extrabold text-white mt-2 tracking-tight">
            Evidence behind today&apos;s prescription
          </h2>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed max-w-2xl">
            {context.summary}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-blue-300">
          <FlaskConical className="w-3.5 h-3.5" />
          Research linked
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <SurfaceCard icon={<Target className="w-4 h-4 text-cyan-300" />} title="Sport & Position Profile">
          <div className="flex flex-wrap items-center gap-2">
            <Chip>{context.sportProfile.sportName}</Chip>
            <Chip>{context.sportProfile.positionName}</Chip>
            <Chip tone="cyan">{context.sportProfile.archetype}</Chip>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed mt-3">{context.sportProfile.summary}</p>

          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <div>
              <SectionLabel>Demand Profile</SectionLabel>
              <div className="space-y-2 mt-2">
                {context.sportProfile.demands.map((item) => (
                  <ListRow key={item} text={item} tone="cyan" />
                ))}
              </div>
            </div>
            <div>
              <SectionLabel>Risk Hotspots</SectionLabel>
              <div className="flex flex-wrap gap-2 mt-2">
                {context.sportProfile.riskHotspots.map((item) => (
                  <Chip key={item} tone="amber">{item}</Chip>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <div>
              <SectionLabel>General Recommendations</SectionLabel>
              <div className="space-y-2 mt-2">
                {context.sportProfile.generalRecommendations.map((item) => (
                  <ListRow key={item} text={item} tone="cyan" />
                ))}
              </div>
            </div>
            <div>
              <SectionLabel>Position Recommendations</SectionLabel>
              <div className="space-y-2 mt-2">
                {context.sportProfile.positionRecommendations.map((item) => (
                  <ListRow key={item} text={item} tone="cyan" />
                ))}
              </div>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard icon={<TrendingUp className="w-4 h-4 text-emerald-400" />} title="Conditioning Logic">
          <p className="text-xs font-semibold text-white">{context.conditioning.archetype}</p>
          <p className="text-[11px] text-slate-400 leading-relaxed mt-2">{context.conditioning.todayFit}</p>

          <SectionLabel className="mt-4">Physiology Priorities</SectionLabel>
          <div className="space-y-2 mt-2">
            {context.sportProfile.physiologyPriorities.map((item) => (
              <ListRow key={item} text={item} tone="emerald" />
            ))}
          </div>

          <SectionLabel className="mt-4">Load Warnings</SectionLabel>
          <div className="space-y-2 mt-2">
            {context.conditioning.loadWarnings.map((item) => (
              <ListRow key={item} text={item} tone="amber" />
            ))}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SurfaceCard icon={<BrainCircuit className="w-4 h-4 text-fuchsia-300" />} title="Sports Psychology">
          <p className="text-[11px] text-slate-400 leading-relaxed">{context.psychology.summary}</p>

          <SectionLabel className="mt-4">Mental Skills</SectionLabel>
          <div className="space-y-2 mt-2">
            {context.psychology.skills.map((item) => (
              <ListRow key={item} text={item} tone="magenta" />
            ))}
          </div>

          <SectionLabel className="mt-4">What To Monitor</SectionLabel>
          <div className="space-y-2 mt-2">
            {context.psychology.monitoring.map((item) => (
              <ListRow key={item} text={item} tone="blue" />
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard icon={<MoonStar className="w-4 h-4 text-sky-300" />} title="Recovery & Sleep">
          <p className="text-[11px] text-slate-400 leading-relaxed">{context.recovery.summary}</p>

          <SectionLabel className="mt-4">Recovery Priorities</SectionLabel>
          <div className="space-y-2 mt-2">
            {context.recovery.priorities.map((item) => (
              <ListRow key={item} text={item} tone="blue" />
            ))}
          </div>

          <SectionLabel className="mt-4">Monitoring</SectionLabel>
          <div className="space-y-2 mt-2">
            {context.recovery.monitoring.map((item) => (
              <ListRow key={item} text={item} tone="blue" />
            ))}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.96fr_1.04fr]">
        <SurfaceCard icon={<UtensilsCrossed className="w-4 h-4 text-lime-300" />} title="Performance Nutrition">
          <p className="text-[11px] text-slate-400 leading-relaxed">{context.nutrition.summary}</p>

          <SectionLabel className="mt-4">Fueling Priorities</SectionLabel>
          <div className="space-y-2 mt-2">
            {context.nutrition.priorities.map((item) => (
              <ListRow key={item} text={item} tone="lime" />
            ))}
          </div>

          <SectionLabel className="mt-4">Timing & Guardrails</SectionLabel>
          <div className="space-y-2 mt-2">
            {context.nutrition.timing.map((item) => (
              <ListRow key={item} text={item} tone="lime" />
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard icon={<ShieldCheck className="w-4 h-4 text-blue-400" />} title="Return-To-Play Guardrails">
          {context.injuryReturn ? (
            <>
              <p className="text-xs font-semibold text-white">
                {context.injuryReturn.injuryType} - {context.injuryReturn.phaseLabel}
              </p>
              <div className="space-y-2 mt-4">
                {context.injuryReturn.progressCriteria.map((item) => (
                  <ListRow key={item} text={item} tone="blue" />
                ))}
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 mt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Competition gate</p>
                <p className="text-[11px] text-slate-300 leading-relaxed">{context.injuryReturn.competitionGate}</p>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-white">No active rehab override</p>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-2">
                CREEDA still uses return-to-sport logic in the background: pain, function, confidence, and real sport exposure all matter more than a single good day.
              </p>
              <div className="space-y-2 mt-4">
                <ListRow text="Do not let low pain at rest falsely clear high-speed or chaotic sport exposure." tone="blue" />
                <ListRow text="Earn progression with repeatable quality, not by jumping stages because the calendar says so." tone="blue" />
              </div>
            </>
          )}
        </SurfaceCard>
      </div>

      <SurfaceCard icon={<Pill className="w-4 h-4 text-orange-400" />} title="Supplement Strategy">
        <p className="text-[11px] text-slate-400 leading-relaxed">{context.antiDopingNote}</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 mt-4">
          {context.supplements.length > 0 ? (
            context.supplements.map((item) => (
              <div key={item.name} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-white">{item.name}</p>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-orange-300 bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded-md">
                    {item.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-3">{item.useCase}</p>
                <div className="space-y-2 mt-4">
                  <InfoLine label="Protocol" value={item.protocol} />
                  <InfoLine label="Caution" value={item.caution} />
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 md:col-span-2 xl:col-span-3">
              <p className="text-sm font-semibold text-white">No supplement push today</p>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-2">
                Food-first recovery and the core prescription are likely the bigger win than adding an ergogenic aid right now.
              </p>
            </div>
          )}
        </div>
      </SurfaceCard>

      {context.evidence.length > 0 && (
        <SurfaceCard icon={<FlaskConical className="w-4 h-4 text-purple-400" />} title="Primary Sources">
          <div className="grid gap-3 md:grid-cols-2">
            {context.evidence.map((source) => (
              <a
                key={source.id}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-purple-300">{source.shortLabel}</p>
                    <p className="text-sm font-semibold text-white mt-2 leading-snug">{source.title}</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed mt-2">{source.application}</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
                </div>
              </a>
            ))}
          </div>
        </SurfaceCard>
      )}
    </motion.section>
  );
};

function SurfaceCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function SectionLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`text-[9px] font-bold uppercase tracking-widest text-slate-500 ${className}`.trim()}>
      {children}
    </p>
  );
}

function Chip({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "cyan" | "amber";
}) {
  const toneClass =
    tone === "cyan"
      ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-200"
      : tone === "amber"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
        : "border-white/[0.08] bg-white/[0.03] text-slate-300";

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${toneClass}`}>
      {children}
    </span>
  );
}

function ListRow({
  text,
  tone,
}: {
  text: string;
  tone: "emerald" | "amber" | "blue" | "cyan" | "magenta" | "lime";
}) {
  const dotTone =
    tone === "emerald"
      ? "bg-emerald-400"
      : tone === "amber"
        ? "bg-amber-400"
        : tone === "cyan"
          ? "bg-cyan-300"
          : tone === "magenta"
            ? "bg-fuchsia-300"
            : tone === "lime"
              ? "bg-lime-300"
              : "bg-blue-400";

  return (
    <div className="flex items-start gap-3">
      <span className={`w-1.5 h-1.5 rounded-full ${dotTone} mt-1.5 flex-shrink-0`} />
      <p className="text-[11px] text-slate-300 leading-relaxed">{text}</p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="text-[11px] text-slate-300 leading-relaxed mt-1">{value}</p>
    </div>
  );
}
