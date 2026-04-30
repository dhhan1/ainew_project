const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function formatKst(iso: string): string {
  const d = new Date(new Date(iso).getTime() + KST_OFFSET_MS);
  const y = d.getUTCFullYear();
  const M = pad(d.getUTCMonth() + 1);
  const D = pad(d.getUTCDate());
  const h = pad(d.getUTCHours());
  const m = pad(d.getUTCMinutes());
  return `${y}-${M}-${D} ${h}:${m} KST`;
}

export function formatRelativeKo(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}
