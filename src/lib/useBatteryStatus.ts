import { useEffect, useState } from 'react';

interface BatteryManagerLike extends EventTarget {
  charging: boolean;
  level: number;
}

declare global {
  interface Navigator {
    getBattery?: () => Promise<BatteryManagerLike>;
  }
}

export interface BatteryStatus {
  supported: boolean;
  pct: number | null;
  charging: boolean;
}

export function useBatteryStatus(): BatteryStatus {
  const [status, setStatus] = useState<BatteryStatus>({
    supported: false,
    pct: null,
    charging: true,
  });

  useEffect(() => {
    if (typeof navigator === 'undefined' || typeof navigator.getBattery !== 'function') {
      return;
    }

    let mounted = true;
    let batteryRef: BatteryManagerLike | null = null;

    const sync = () => {
      if (!mounted || !batteryRef) return;
      setStatus({
        supported: true,
        pct: Math.round(batteryRef.level * 100),
        charging: batteryRef.charging,
      });
    };

    const init = async () => {
      try {
        // Brave spoofs navigator.getBattery() as 100% charging; hide it there instead of showing fake %
        const nav = navigator as Navigator & { brave?: { isBrave?: () => Promise<boolean> } };
        if (typeof nav.brave?.isBrave === 'function' && (await nav.brave.isBrave())) {
          return;
        }
        const bat = await navigator.getBattery!();
        if (!mounted) return;
        batteryRef = bat;
        sync();
        bat.addEventListener('levelchange', sync);
        bat.addEventListener('chargingchange', sync);
      } catch {
        // Battery API unavailable or blocked
      }
    };

    void init();

    return () => {
      mounted = false;
      if (batteryRef) {
        batteryRef.removeEventListener('levelchange', sync);
        batteryRef.removeEventListener('chargingchange', sync);
      }
    };
  }, []);

  return status;
}
