// useFeatureFlag — Phase 7 React hook
// Non-suspending: returns { enabled, loading }. Safe to render before load resolves.

import { useEffect, useState } from "react";
import {
  isFeatureEnabled,
  getAllFeatureFlags,
  type FeatureFlagKey,
} from "@/lib/feature-flags";

export function useFeatureFlag(flag: FeatureFlagKey) {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let alive = true;
    isFeatureEnabled(flag).then((v) => {
      if (!alive) return;
      setEnabled(v);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [flag]);

  return { enabled, loading };
}

export function useAllFeatureFlags() {
  const [flags, setFlags] = useState<Record<FeatureFlagKey, boolean> | null>(null);
  useEffect(() => {
    let alive = true;
    getAllFeatureFlags().then((f) => {
      if (alive) setFlags(f);
    });
    return () => {
      alive = false;
    };
  }, []);
  return flags;
}
