import { useEffect, useState, useCallback } from "react";

export type MicSettings = {
  /** 0..1 where higher = more sensitive (lower RMS threshold). */
  sensitivity: number;
  /** Input gain multiplier 0..3. 1 = no change. */
  gain: number;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
};

export const DEFAULT_MIC_SETTINGS: MicSettings = {
  sensitivity: 0.7,
  gain: 1,
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
};

const KEY = "goroll:micSettings";
const EVT = "goroll:micSettings:change";

function read(): MicSettings {
  if (typeof window === "undefined") return DEFAULT_MIC_SETTINGS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_MIC_SETTINGS;
    return { ...DEFAULT_MIC_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_MIC_SETTINGS;
  }
}

/** Convert sensitivity 0..1 to RMS threshold. Higher sensitivity = lower threshold. */
export function sensitivityToThreshold(s: number): number {
  const clamped = Math.max(0, Math.min(1, s));
  // Map 0 -> 0.15 (insensitive), 1 -> 0.008 (very sensitive)
  return 0.15 - clamped * (0.15 - 0.008);
}

export function useMicSettings() {
  const [settings, setSettings] = useState<MicSettings>(read);

  useEffect(() => {
    const onChange = () => setSettings(read());
    window.addEventListener(EVT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const update = useCallback((patch: Partial<MicSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      window.dispatchEvent(new Event(EVT));
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    try { localStorage.setItem(KEY, JSON.stringify(DEFAULT_MIC_SETTINGS)); } catch {}
    window.dispatchEvent(new Event(EVT));
    setSettings(DEFAULT_MIC_SETTINGS);
  }, []);

  return { settings, update, reset };
}
