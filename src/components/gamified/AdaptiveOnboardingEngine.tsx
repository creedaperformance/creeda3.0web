"use client";

import React, { useState } from "react";
import { OnboardingStep } from "./OnboardingStep";
import { GamifiedButton } from "./GamifiedButton";
import { HUDLabel } from "./HUDLabel";
import { EmptyStateCard } from "./EmptyStateCard";
import { useCreedaState } from "@/lib/state_engine";
import { AnimatePresence } from "framer-motion";

export const AdaptiveOnboardingEngine: React.FC = () => {
  const { state, sync } = useCreedaState();
  const [currentStep, setCurrentStep] = useState(0);
  const [complete, setComplete] = useState(false);

  const isAthlete = state.userType === "athlete";
  const athleteSteps = [
    { title: "Sport Identity", subtitle: "Select your primary competitive discipline." },
    { title: "Performance Baseline", subtitle: "Define your current peak metrics." },
    { title: "Injury History", subtitle: "Flag any active or chronic restrictions." },
  ];
  const generalSteps = [
    { title: "Lifestyle Pulse", subtitle: "Define your daily activity and sitting hours." },
    { title: "Wellness Goals", subtitle: "What are you optimizing for?" },
    { title: "Current Resilience", subtitle: "Rate your average sleep and stress levels." },
  ];

  const steps = isAthlete ? athleteSteps : generalSteps;
  const totalSteps = steps.length;

  const next = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setComplete(true);
      sync();
    }
  };

  if (complete) {
    return (
      <div className="max-w-lg mx-auto py-12 px-6">
        <EmptyStateCard 
          title="Onboarding Decoded" 
          description="Your performance baseline has been established. You are now ready to enter the HUD." 
          actionLabel="Enter Dashboard" 
          onAction={() => window.location.href = "/dashboard"}
          icon="ACTIVITY"
        />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 px-6">
      <AnimatePresence mode="wait">
        <OnboardingStep 
          key={currentStep}
          stepIndex={currentStep} 
          totalSteps={totalSteps} 
          title={steps[currentStep].title}
          subtitle={steps[currentStep].subtitle}
        >
          {/* Placeholder for role-specific questions */}
          <div className="space-y-4 py-4">
            <div className="h-20 bg-slate-800/20 rounded-xl border border-dashed border-slate-700/50 flex items-center justify-center">
              <span className="text-slate-500 text-xs font-bold font-orbitron uppercase">
                {isAthlete ? "Sport Content" : "Wellness Content"} Injection
              </span>
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            {currentStep > 0 && (
              <GamifiedButton 
                variant="SECONDARY" 
                size="MD" 
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                Retrace
              </GamifiedButton>
            )}
            <GamifiedButton 
              variant="PRIMARY" 
              size="MD" 
              onClick={next}
              className="flex-1"
            >
              {currentStep === totalSteps - 1 ? "Initialize" : "Next Phase"}
            </GamifiedButton>
          </div>
        </OnboardingStep>
      </AnimatePresence>
    </div>
  );
};
