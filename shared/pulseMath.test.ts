import { describe, expect, it } from "vitest";
import { convertAmount } from "./pulseMath.ts";

describe("convertAmount", () => {
  it("converts via USD rates", () => {
    const rates = { EUR: 0.9, GEL: 2.7 };
    expect(convertAmount(90, "EUR", "USD", rates)).toBeCloseTo(100);
    expect(convertAmount(100, "USD", "GEL", rates)).toBeCloseTo(270);
    expect(convertAmount(10, "USD", "USD", rates)).toBe(10);
  });
});
