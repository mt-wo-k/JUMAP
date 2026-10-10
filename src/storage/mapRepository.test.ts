import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChoroplethMap } from '../domain/types'
import { loadMaps, saveMaps } from './mapRepository'

const storageKey = 'jumap:maps:v1'

function createStorage() {
  const entries = new Map<string, string>()
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
    clear: () => entries.clear(),
  }
}

const sampleMap: ChoroplethMap = {
  id: 'map-1',
  name: '旅行メモ',
  prefectureCodes: ['13'],
  unit: '件',
  maxColor: '#ff6b4a',
  areas: { '13101': { value: 12, memo: 'テスト' } },
  createdAt: '2026-10-10T00:00:00.000Z',
  updatedAt: '2026-10-10T00:00:00.000Z',
}

describe('mapRepository', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorage())
  })

  it('saves and loads maps from browser storage', () => {
    saveMaps([sampleMap])

    expect(localStorage.getItem(storageKey)).toContain('旅行メモ')
    expect(loadMaps()).toEqual([sampleMap])
  })

  it('returns an empty collection when storage is empty or malformed', () => {
    expect(loadMaps()).toEqual([])
    localStorage.setItem(storageKey, '{invalid json')
    expect(loadMaps()).toEqual([])
  })

  it('skips records that do not have the minimum map shape', () => {
    localStorage.setItem(storageKey, JSON.stringify([{ id: 'incomplete' }, sampleMap]))

    expect(loadMaps()).toEqual([sampleMap])
  })
})
