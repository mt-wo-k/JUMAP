import type { ChoroplethMap } from '../domain/types'

const STORAGE_KEY = 'jumap:maps:v1'

export function loadMaps(): ChoroplethMap[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return []

    const parsed: unknown = JSON.parse(saved)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is ChoroplethMap =>
      typeof item?.id === 'string'
      && typeof item?.name === 'string'
      && Array.isArray(item?.prefectureCodes)
      && typeof item?.areas === 'object'
      && item.areas !== null,
    )
  } catch {
    return []
  }
}

export function saveMaps(maps: ChoroplethMap[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(maps))
  } catch {
    // Keep the in-memory session usable if browser storage is unavailable or full.
  }
}
