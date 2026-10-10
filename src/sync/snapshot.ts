import type { ChoroplethMap } from "../domain/types.js";

export function isChoroplethMapSnapshot(
  value: unknown,
): value is ChoroplethMap[] {
  if (!Array.isArray(value) || value.length > 1000) return false;

  return value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const map = item as Record<string, unknown>;
    if (
      typeof map.id !== "string" || map.id.length > 100
      || typeof map.name !== "string" || map.name.length > 48
      || !Array.isArray(map.prefectureCodes)
      || !map.prefectureCodes.every((code) => typeof code === "string" && /^\d{2}$/.test(code))
      || typeof map.unit !== "string" || map.unit.length > 12
      || typeof map.maxColor !== "string" || !/^#[\da-f]{6}$/i.test(map.maxColor)
      || typeof map.invertColorScale !== "boolean"
      || !map.areas || typeof map.areas !== "object" || Array.isArray(map.areas)
      || typeof map.createdAt !== "string" || !Number.isFinite(Date.parse(map.createdAt))
      || typeof map.updatedAt !== "string" || !Number.isFinite(Date.parse(map.updatedAt))
    ) return false;

    return Object.values(map.areas).every((area) => {
      if (!area || typeof area !== "object" || Array.isArray(area)) return false;
      const entry = area as Record<string, unknown>;
      return (entry.value === null || (typeof entry.value === "number" && Number.isFinite(entry.value)))
        && typeof entry.memo === "string"
        && entry.memo.length <= 1000;
    });
  });
}
