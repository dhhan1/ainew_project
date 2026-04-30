import { describe, expect, it } from "vitest";
import { score } from "./score";

const NOW = new Date("2026-04-30T12:00:00Z");

describe("score", () => {
  it("gives the highest score to a fresh article in a large cluster", () => {
    const fresh3 = score({
      publishedAt: new Date("2026-04-30T12:00:00Z").toISOString(),
      clusterSize: 3,
      now: NOW,
    });
    const old1 = score({
      publishedAt: new Date("2026-04-29T18:00:00Z").toISOString(),
      clusterSize: 1,
      now: NOW,
    });
    expect(fresh3).toBeGreaterThan(old1);
  });

  it("treats cluster_size monotonically (more sources → higher score)", () => {
    const t = new Date("2026-04-30T08:00:00Z").toISOString();
    const c1 = score({ publishedAt: t, clusterSize: 1, now: NOW });
    const c3 = score({ publishedAt: t, clusterSize: 3, now: NOW });
    expect(c3).toBeGreaterThan(c1);
  });

  it("decays with time even at fixed cluster size", () => {
    const recent = score({
      publishedAt: new Date("2026-04-30T11:00:00Z").toISOString(),
      clusterSize: 2,
      now: NOW,
    });
    const older = score({
      publishedAt: new Date("2026-04-29T15:00:00Z").toISOString(),
      clusterSize: 2,
      now: NOW,
    });
    expect(recent).toBeGreaterThan(older);
  });
});
