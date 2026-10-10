import { feature as toGeoJson } from 'topojson-client'
import type { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson'
import type { GeometryCollection, Topology } from 'topojson-specification'
import type { AreaFeature } from '../domain/types'

type MunicipalitiesTopology = Topology<{
  municipalities: GeometryCollection<GeoJsonProperties>
}>

const requestCache = new Map<string, Promise<FeatureCollection<Geometry, GeoJsonProperties>>>()

function loadPrefecture(code: string) {
  const cached = requestCache.get(code)
  if (cached) return cached

  const request = fetch(`/data/municipalities/${code}/municipalities.topojson`)
    .then((response) => {
      if (!response.ok) throw new Error(`${code} の境界データを読み込めませんでした。`)
      return response.json() as Promise<MunicipalitiesTopology>
    })
    .then((topology) => toGeoJson(topology, topology.objects.municipalities))

  requestCache.set(code, request)
  request.catch(() => requestCache.delete(code))
  return request
}

export async function loadMunicipalities(prefectureCodes: string[]) {
  const collections = await Promise.all(prefectureCodes.map(loadPrefecture))
  return collections.flatMap((collection) => collection.features) as AreaFeature[]
}
