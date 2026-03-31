'use client'

import { useEffect, useCallback, useRef } from 'react'
import { encryptData, decryptData, clearSecureStorage } from '@/lib/secure_storage'
import { toast } from 'sonner'

const PERSISTENCE_KEY = 'creeda_onboarding_draft';

export function useOnboardingPersistence(
  values: any, 
  currentStep: number, 
  setValues: (vals: any) => void, 
  setCurrentStep: (step: number) => void,
  isReady: boolean,
  userId: string | null
) {
  const isInitialized = useRef(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const persistenceKey = userId ? `creeda_onboarding_draft_${userId}` : null;

  useEffect(() => {
    if (isReady) isInitialized.current = true;
  }, [isReady]);

  // Persist Stage: Debounced Save
  useEffect(() => {
    // Only save if we are ready and have meaningful data
    if (!isReady || !isInitialized.current || !persistenceKey || (currentStep === 0 && !values.fullName)) {
        return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const payload = JSON.stringify({ values, step: currentStep });
        const encrypted = await encryptData(payload);
        localStorage.setItem(persistenceKey, encrypted);
      } catch (err) {
        console.error("Persistence failure:", err);
      }
    }, 1000); 

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    }
  }, [values, currentStep, persistenceKey]);

  const clearDraft = useCallback(() => {
    if (persistenceKey) clearSecureStorage(persistenceKey);
  }, [persistenceKey]);

  return { clearDraft };
}
