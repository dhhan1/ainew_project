const ALPHA = 1.0;
const BETA = 0.5;
const HALF_LIFE_HOURS = 12;

export interface ScoreInput {
  publishedAt: string;
  clusterSize?: number;
  now?: Date;
}

export function score({ publishedAt, clusterSize = 1, now = new Date() }: ScoreInput): number {
  const deltaMs = now.getTime() - new Date(publishedAt).getTime();
  const deltaHours = Math.max(deltaMs / (1000 * 60 * 60), 0);
  const recencyDecay = Math.exp(-deltaHours / HALF_LIFE_HOURS);
  return ALPHA * clusterSize + BETA * recencyDecay;
}
