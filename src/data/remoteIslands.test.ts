import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { feature as toGeoJson } from 'topojson-client'
import type { GeoJsonProperties } from 'geojson'
import type { GeometryCollection, Topology } from 'topojson-specification'
import type { AreaFeature } from '../domain/types'
import { excludeRemoteIslandFeatures } from './remoteIslands'

function readPrefectureFeatures(prefectureCode: string) {
  const topologyPath = new URL(`../../public/data/municipalities/${prefectureCode}/municipalities.topojson`, import.meta.url)
  const topology = JSON.parse(readFileSync(topologyPath, 'utf8')) as Topology<{
    municipalities: GeometryCollection<GeoJsonProperties>
  }>
  return toGeoJson(topology, topology.objects.municipalities).features as AreaFeature[]
}

describe('excludeRemoteIslandFeatures', () => {
  it('omits configured remote island areas while retaining nearby areas', () => {
    const features = [
      { type: 'Feature', id: '13361', properties: {}, geometry: { type: 'MultiPolygon', coordinates: [] } },
      { type: 'Feature', id: '13101', properties: {}, geometry: { type: 'MultiPolygon', coordinates: [] } },
    ] as AreaFeature[]

    expect(excludeRemoteIslandFeatures(features, '13').map((item) => item.id)).toEqual(['13101'])
  })

  it('leaves every Okinawa feature untouched', () => {
    const features = readPrefectureFeatures('47')

    expect(excludeRemoteIslandFeatures(features, '47')).toBe(features)
    expect(features).toHaveLength(42)
  })

  it('removes Tokyo remote islands and their unassigned boundary fragments from map bounds', () => {
    const sourceFeatures = readPrefectureFeatures('13')
    const filteredFeatures = excludeRemoteIslandFeatures(sourceFeatures, '13')

    expect(filteredFeatures).toHaveLength(53)
    expect(filteredFeatures.some((item) => String(item.id) === '13000')).toBe(false)
    expect(filteredFeatures.some((item) => String(item.id) === '13101')).toBe(true)
    expect(filteredFeatures.some((item) => String(item.id) === '13361')).toBe(false)

    const latitudes = filteredFeatures.flatMap((item) => {
      if (item.geometry.type !== 'MultiPolygon') return []
      return item.geometry.coordinates.flat(2).map((coordinate) => coordinate[1])
    })
    expect(Math.min(...latitudes)).toBeGreaterThan(35)
  })

  it('removes only Tobishima parts from Sakata and preserves the 2025 source geometry elsewhere', () => {
    const sourceFeatures = readPrefectureFeatures('06')
    const sourceSakata = sourceFeatures.find((item) => String(item.id) === '06204') as AreaFeature
    const filteredSakata = excludeRemoteIslandFeatures([sourceSakata], '06')[0]

    expect(sourceSakata.geometry.type).toBe('MultiPolygon')
    expect(filteredSakata.geometry.type).toBe('MultiPolygon')
    if (sourceSakata.geometry.type !== 'MultiPolygon' || filteredSakata.geometry.type !== 'MultiPolygon') return

    expect(sourceSakata.geometry.coordinates).toHaveLength(70)
    expect(filteredSakata.geometry.coordinates).toEqual([
      sourceSakata.geometry.coordinates[0],
      sourceSakata.geometry.coordinates[2],
      sourceSakata.geometry.coordinates[4],
    ])
    expect(sourceSakata.geometry.coordinates).toHaveLength(70)
    expect(filteredSakata.id).toBe('06204')
  })
})
