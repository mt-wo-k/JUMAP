import { describe, expect, it } from "vitest";
import { isChoroplethMapSnapshot } from "./snapshot";
import type { ChoroplethMap } from "../domain/types";

const validMap: ChoroplethMap = {
  id: "test-map",
  name: "テスト",
  prefectureCodes: ["13"],
  unit: "円",
  maxColor: "#E26A51",
  invertColorScale: false,
  areas: {
    "13101": { value: 42, memo: "メモ" },
    "13102": { value: null, memo: "" },
  },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

describe("isChoroplethMapSnapshot", () => {
  it("accepts valid map data and an empty snapshot", () => {
    expect(isChoroplethMapSnapshot([validMap])).toBe(true);
    expect(isChoroplethMapSnapshot([])).toBe(true);
  });

  it("rejects malformed map fields and non-finite values", () => {
    expect(isChoroplethMapSnapshot([{ ...validMap, maxColor: "red" }])).toBe(false);
    expect(isChoroplethMapSnapshot([{
      ...validMap,
      areas: { "13101": { value: Number.NaN, memo: "" } },
    }])).toBe(false);
    expect(isChoroplethMapSnapshot(null)).toBe(false);
  });

  it("rejects notes over the editor limit and oversized map collections", () => {
    expect(isChoroplethMapSnapshot([{
      ...validMap,
      areas: { "13101": { value: null, memo: "a".repeat(1001) } },
    }])).toBe(false);
    expect(isChoroplethMapSnapshot(Array.from({ length: 1001 }, (_, index) => ({
      ...validMap,
      id: String(index),
    })))).toBe(false);
  });
});
