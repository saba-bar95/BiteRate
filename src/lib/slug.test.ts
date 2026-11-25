import { describe, expect, it } from "vitest";

function isCompareSlugPair(param: string | undefined) {
  if (!param?.includes("-vs-")) return null;
  const [from, to] = param.split("-vs-");
  if (!from || !to) return null;
  return { from, to };
}

describe("compare slug parsing", () => {
  it("parses from-vs-to", () => {
    expect(isCompareSlugPair("new-york-vs-tbilisi")).toEqual({
      from: "new-york",
      to: "tbilisi",
    });
  });

  it("rejects invalid", () => {
    expect(isCompareSlugPair("tbilisi")).toBeNull();
    expect(isCompareSlugPair(undefined)).toBeNull();
  });
});
