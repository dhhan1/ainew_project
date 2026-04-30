import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ClusterBadge({ count }: { count: number }) {
  if (count < 2) return null;
  return (
    <Badge variant="secondary" data-cluster-size={count}>
      <Users className="h-3 w-3" />
      <span>{count}개 매체 보도</span>
    </Badge>
  );
}
