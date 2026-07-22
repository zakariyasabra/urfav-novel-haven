import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ActionInput = z.object({
  id: z.string().uuid(),
  note: z.string().max(2000).optional(),
});

export const approveAuthorApplicationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ActionInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("approve_author_application", {
      _app_id: data.id,
      _note: data.note,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const rejectAuthorApplicationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ActionInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("reject_author_application", {
      _app_id: data.id,
      _note: data.note,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
