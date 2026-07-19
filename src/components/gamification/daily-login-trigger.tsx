import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { awardXp } from "@/hooks/use-gamification";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fires once per UTC day when a user is authenticated:
 *  - awards daily_login XP
 *  - bumps reading streak
 * Also processes a pending referral code stored in sessionStorage.
 */
export function DailyLoginTrigger() {
  const { user } = useAuth();
  const done = useRef(false);

  useEffect(() => {
    if (!user || done.current) return;
    done.current = true;
    const today = new Date().toISOString().slice(0, 10);
    const key = `favnol_daily_${user.id}`;
    try {
      const last = localStorage.getItem(key);
      if (last !== today) {
        awardXp("daily_login", `${user.id}:${today}`);
        void supabase.rpc("bump_reading_streak");
        localStorage.setItem(key, today);
      }
    } catch {
      /* localStorage unavailable */
    }

    // Process pending referral
    try {
      const ref = sessionStorage.getItem("favnol_ref");
      if (ref) {
        sessionStorage.removeItem("favnol_ref");
        void supabase.rpc("gm_use_referral", { _code: ref });
      }
    } catch {
      /* ignore */
    }
  }, [user]);

  return null;
}
