import { describe, expect, it } from "vitest";
import { buildClientDecide } from "./clientDecide";

describe("buildClientDecide", () => {
  it("marks degraded and uses home city + budget in the go score", async () => {
    const result = await buildClientDecide({
      fromSlug: "new-york",
      toSlug: "tbilisi",
      budget: 50,
      mode: "go",
      days: 7,
      months: 1,
    });

    expect(result).not.toBeNull();
    expect(result!.degraded).toBe(true);
    expect(result!.homePpIndex).toBeTypeOf("number");
    expect(result!.homePpIndex).toBeGreaterThan(0);
    expect(result!.shouldGo.factors.find((f) => f.id === "pp")?.detail).toMatch(
      /vs home/,
    );
    expect(
      result!.shouldGo.factors.find((f) => f.id === "cost")?.detail,
    ).toMatch(/budget covers/);
  });

  it("returns null for unknown cities", async () => {
    const result = await buildClientDecide({
      fromSlug: "not-a-city",
      toSlug: "tbilisi",
      budget: 100,
      mode: "go",
      days: 7,
      months: 1,
    });
    expect(result).toBeNull();
  });
});
