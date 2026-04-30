import { Badge } from "@/components/ui/badge";
import type { SourceMeta } from "@/types/news";

export function SourceBadge({ source }: { source: SourceMeta }) {
  return <Badge variant="outline">{source.label}</Badge>;
}
