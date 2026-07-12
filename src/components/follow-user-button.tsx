import { showError } from "@/lib/errors";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { followUser, unfollowUser, isFollowingUser, fetchFollowerCount } from "@/lib/admin-api";

export function FollowUserButton({ userId }: { userId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const followQ = useQuery({ queryKey: ["is-following", userId, user?.id], queryFn: () => isFollowingUser(userId), enabled: !!user });
  const countQ = useQuery({ queryKey: ["follower-count", userId], queryFn: () => fetchFollowerCount(userId) });

  const isSelf = user?.id === userId;
  if (isSelf) return <div className="text-xs text-muted-foreground">{countQ.data ?? 0} متابع</div>;

  async function toggle() {
    try {
      if (followQ.data) await unfollowUser(userId);
      else await followUser(userId);
      qc.invalidateQueries({ queryKey: ["is-following", userId] });
      qc.invalidateQueries({ queryKey: ["follower-count", userId] });
    } catch (e) { showError(e); }
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant={followQ.data ? "outline" : "default"} onClick={toggle}>
        {followQ.data ? <><UserCheck className="me-1 h-4 w-4" />تتابع</> : <><UserPlus className="me-1 h-4 w-4" />متابعة</>}
      </Button>
      <span className="text-xs text-muted-foreground">{countQ.data ?? 0} متابع</span>
    </div>
  );
}
