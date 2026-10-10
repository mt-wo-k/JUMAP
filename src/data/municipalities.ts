import { feature as toGeoJson } from 'topojson-client'
import polygonClipping, { type MultiPolygon as ClippedMultiPolygon, type Polygon as ClippedPolygon } from 'polygon-clipping'
import type { Feature, MultiLineString, GeoJsonProperties, Position } from 'geojson'
import type { GeometryCollection, Topology } from 'topojson-specification'
import type { AreaFeature } from '../domain/types'
import { excludeRemoteIslandTopologyObject } from './remoteIslands'

type MunicipalitiesTopology = Topology<{
  municipalities: GeometryCollection<GeoJsonProperties>
}>

export type MunicipalityMapData = {
  features: AreaFeature[]
  prefectureOutlines: Feature<MultiLineString, GeoJsonProperties>[]
}

const requestCache = new Map<string, Promise<MunicipalitiesTopology>>()

function loadPrefecture(code: string) {
  const cached = requestCache.get(code)
  if (cached) return cached

  const request = fetch(`/data/municipalities/${code}/municipalities.topojson`)
    .then((response) => {
      if (!response.ok) throw new Error(`${code} の境界データを読み込めませんでした。`)
      return response.json() as Promise<MunicipalitiesTopology>
    })

  requestCache.set(code, request)
  request.catch(() => requestCache.delete(code))
  return request
}

export async function loadMunicipalities(prefectureCodes: string[]) {
  const topologies = await Promise.all(prefectureCodes.map(loadPrefecture))
  const prefectureData = topologies.map((topology, index) => {
    const code = prefectureCodes[index] ?? ''
    const visibleObject = excludeRemoteIslandTopologyObject(topology.objects.municipalities, code)
    const collection = toGeoJson(topology, visibleObject)
    const polygons = collection.features.flatMap((feature) => {
      if (feature.geometry.type === 'MultiPolygon') {
        return [feature.geometry.coordinates as unknown as ClippedMultiPolygon]
      }
      if (feature.geometry.type === 'Polygon') {
        return [[feature.geometry.coordinates as unknown as ClippedPolygon]]
      }
      return []
    })
    const merged = polygons.length > 0
      ? polygonClipping.union(polygons[0], ...polygons.slice(1))
      : []
    const outlineCoordinates = merged.flatMap((polygon) => polygon) as Position[][]

    return {
      features: collection.features as AreaFeature[],
      outline: {
        type: 'Feature' as const,
        properties: { prefectureCode: code },
        geometry: { type: 'MultiLineString', coordinates: outlineCoordinates },
      } satisfies Feature<MultiLineString, GeoJsonProperties>,
    }
  })

  return {
    features: prefectureData.flatMap(({ features }) => features),
    prefectureOutlines: prefectureData
      .filter(({ outline }) => outline.geometry.coordinates.length > 0)
      .map(({ outline }) => outline),
  } satisfies MunicipalityMapData
}
