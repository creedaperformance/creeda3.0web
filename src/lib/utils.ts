import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function scrollToTop() {
  if (typeof window === 'undefined') return;
  
  const performScroll = () => {
    const dashboardMain = document.getElementById('dashboard-main');
    if (dashboardMain) {
      dashboardMain.scrollTo({ top: 0, behavior: 'instant' });
      dashboardMain.scrollTop = 0; // Fallback
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Run immediately and also in next frame to ensure React layout is done
  performScroll();
  requestAnimationFrame(performScroll);
}
