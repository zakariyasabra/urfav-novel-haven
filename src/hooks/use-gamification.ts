import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { gmAward, gmMyProfile, type GmAwardResult, type GmProfile } from "@/lib/gamification-api";

type Listener = (result: GmAwardResult) => void;
const listeners = new Set<Listener>();

export function onGmAward(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useGamification() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<GmProfile | null>(null);

  const refresh = useCallback(async () => {
    if (!user) { setProfile(null); return; }
    const p = await gmMyProfile();
    setProfile(p);
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const award = useCallback(async (code: string, refKey?: string, meta?: Record<string, unknown>) => {
    if (!user) return null;
    const res = await gmAward(code, refKey, meta);
    if (res?.ok && (res.xp || res.coins)) {
      listeners.forEach((l) => l(res));
      void refresh();
    }
    return res;
  }, [user, refresh]);

  return { profile, refresh, award };
}

/** Fire-and-forget award — for use in components that don't need the result. */
export function awardXp(code: string, refKey?: string, meta?: Record<string, unknown>) {
  void gmAward(code, refKey, meta).then((res) => {
    if (res?.ok && (res.xp || res.coins)) listeners.forEach((l) => l(res));
  });
}
