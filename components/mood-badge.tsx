import { MOOD_LABELS } from "@/config/mood";
import type { Mood } from "@/types/news";

export function MoodBadge({ mood }: { mood: Mood }) {
  return (
    <span
      data-mood={mood}
      className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-3 py-0.5 text-xs"
    >
      {MOOD_LABELS[mood]}
    </span>
  );
}
