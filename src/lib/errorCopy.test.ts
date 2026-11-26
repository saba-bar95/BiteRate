import { describe, expect, it } from "vitest";
import { ApiError } from "./api";
import { friendlyError } from "./errorCopy";

describe("friendlyError", () => {
  it("maps network failures", () => {
    const e = friendlyError("Failed to fetch");
    expect(e.kind).toBe("network");
    expect(e.title).toMatch(/reach/i);
  });

  it("maps ApiError statuses", () => {
    expect(friendlyError(new ApiError("Nope", 404)).kind).toBe("not_found");
    expect(friendlyError(new ApiError("Wait", 429)).kind).toBe("rate_limited");
    expect(friendlyError(new ApiError("Boom", 500)).kind).toBe("server");
  });

  it("keeps useful server messages", () => {
    const e = friendlyError(new ApiError("Invalid trip plan", 400));
    expect(e.detail).toBe("Invalid trip plan");
  });
});
