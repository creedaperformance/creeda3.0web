/**
 * CREEDA EVENT ENGINE
 * Reactive trigger system for performance intelligence.
 */

export type CreedaEventType = 
  | "READINESS_DROP" 
  | "HIGH_ACWR" 
  | "POOR_SLEEP_TREND" 
  | "GOAL_REACHED" 
  | "OFFLINE_SYNC_STALLED";

export interface CreedaEvent {
  type: CreedaEventType;
  payload: any;
  timestamp: string;
}

type EventHandler = (event: CreedaEvent) => void;

class EventEngine {
  private handlers: Map<CreedaEventType, Set<EventHandler>> = new Map();

  subscribe(type: CreedaEventType, handler: EventHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)?.add(handler);
    
    return () => this.handlers.get(type)?.delete(handler);
  }

  emit(type: CreedaEventType, payload: any) {
    const event: CreedaEvent = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    };

    console.log(`[EVENT_ENGINE] Emitting: ${type}`, payload);
    
    this.handlers.get(type)?.forEach(handler => handler(event));
  }

  /**
   * Universal Trigger Logic
   * Maps raw data changes to intelligence events.
   */
  processDataUpdate(oldState: any, newState: any) {
    // 1. Readiness Drop Trigger
    if (oldState.readinessScore > 0 && newState.readinessScore < oldState.readinessScore - 10) {
      this.emit("READINESS_DROP", { 
        previous: oldState.readinessScore, 
        current: newState.readinessScore,
        diff: newState.readinessScore - oldState.readinessScore 
      });
    }

    // 2. Trend Logic (To be expanded by Trend Engine)
    // ...
  }
}

export const eventEngine = new EventEngine();
