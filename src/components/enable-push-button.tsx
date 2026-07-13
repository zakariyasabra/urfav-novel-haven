import { useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/provider";
import { subscribePush } from "@/lib/enterprise-api";

export function EnablePushButton() {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted");

  async function enable() {
    setBusy(true);
    const res = await subscribePush();
    setBusy(false);
    if (res.ok) { setOk(true); toast.success(t("push.enabled")); }
    else if (res.error === "unsupported") toast.error(t("push.unsupported"));
    else if (res.error === "denied") toast.error(t("push.denied"));
    else toast.error(t("push.failed"));
  }

  return (
    <Button size="sm" variant="outline" onClick={enable} disabled={busy || ok}>
      {ok ? <Bell className="me-1 h-4 w-4 text-emerald-500" /> : <BellOff className="me-1 h-4 w-4" />}
      {ok ? t("push.enabled") : t("push.enable")}
    </Button>
  );
}
