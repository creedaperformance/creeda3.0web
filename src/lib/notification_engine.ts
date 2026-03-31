/**
 * CREEDA NOTIFICATION ENGINE
 * Bridges event logic to user UI alerts.
 */

import { eventEngine, CreedaEvent } from "./event_engine";

export const initializeNotificationEngine = (addAlert: any) => {
  // 1. Subscribe to Readiness Drop
  eventEngine.subscribe("READINESS_DROP", (event: CreedaEvent) => {
    addAlert({
      type: "RISK",
      message: `Critical alert: Readiness dropped by ${Math.abs(event.payload.diff)}%. Consult recovery protocol.`,
      severity: "HIGH",
    });
  });

  // 2. Subscribe to Trend Stalls (To be fed by Trend Engine)
  eventEngine.subscribe("POOR_SLEEP_TREND", (event: CreedaEvent) => {
    addAlert({
      type: "TREND",
      message: "Consistent 3-day sleep decline detected. Your recovery capacity is decreasing.",
      severity: "MEDIUM",
    });
  });

  // 3. Offline Stalls
  eventEngine.subscribe("OFFLINE_SYNC_STALLED", (event: CreedaEvent) => {
    addAlert({
      type: "SYSTEM",
      message: "Connection lost. Performance data will be cached locally.",
      severity: "LOW",
    });
  });

  console.log("[NOTIFICATION_ENGINE] Initialized and subscribed to global events.");
};
