import type { AreaFeature } from '../domain/types'
import type { GeoJsonProperties } from 'geojson'
import type { GeometryCollection } from 'topojson-specification'

/**
 * Remote island municipalities omitted from every map. These codes and the
 * Tobishima polygon parts below are tied to the committed 2025 boundary data.
 * Recheck this list whenever the source boundary dataset is updated.
 */
const remoteIslandAreaIdsByPrefecture: Record<string, ReadonlySet<string>> = {
  '01': new Set(['01367', '01517', '01518', '01519']),
  // 13000 is Tokyo's unassigned territory geometry, whose components in this
  // dataset lie in the remote island chain and otherwise keep Tokyo zoomed out.
  '13': new Set(['13000', '13361', '13362', '13363', '13364', '13381', '13382', '13401', '13402', '13421']),
  '15': new Set(['15224', '15586']),
  '32': new Set(['32525', '32526', '32527', '32528']),
  '42': new Set(['42209', '42210', '42211', '42383', '42411']),
  '46': new Set([
    '46213', '46222', '46303', '46304', '46501', '46502', '46505',
    '46523', '46524', '46525', '46527', '46529', '46530', '46531', '46532', '46533', '46534', '46535',
  ]),
}

// In the 2025 Sakata topology, parts 1, 3, and 5–69 are Tobishima; 0, 2, and 4
// are the retained Sakata/Honshu polygons. Keep the city's feature ID intact so
// values continue to be stored against the same administrative area.
const sakataTobishimaParts = new Set(
  Array.from({ length: 69 }, (_, index) => index + 1).filter((index) => index !== 2 && index !== 4),
)

const excludedPolygonPartIndexesByAreaId: Record<string, ReadonlySet<number>> = {
  '06204': sakataTobishimaParts,
}

export function excludeRemoteIslandTopologyObject(
  object: GeometryCollection<GeoJsonProperties>,
  prefectureCode: string,
): GeometryCollection<GeoJsonProperties> {
  // Okinawa remains fully visible, including all of its islands.
  if (prefectureCode === '47') return object

  const excludedAreaIds = remoteIslandAreaIdsByPrefecture[prefectureCode]
  return {
    ...object,
    geometries: object.geometries.flatMap((geometry) => {
      const id = String(geometry.id ?? '')
      if (excludedAreaIds?.has(id)) return []

      const excludedParts = excludedPolygonPartIndexesByAreaId[id]
      if (!excludedParts || geometry.type !== 'MultiPolygon') return [geometry]

      const arcs = geometry.arcs.filter((_, index) => !excludedParts.has(index))
      return arcs.length > 0 ? [{ ...geometry, arcs }] : []
    }),
  }
}

export function excludeRemoteIslandFeatures(features: AreaFeature[], prefectureCode: string): AreaFeature[] {
  // Okinawa remains fully visible, including all of its islands.
  if (prefectureCode === '47') return features

  const excludedAreaIds = remoteIslandAreaIdsByPrefecture[prefectureCode]
  return features.flatMap((feature) => {
    const id = String(feature.id ?? '')
    if (excludedAreaIds?.has(id)) return []

    const excludedParts = excludedPolygonPartIndexesByAreaId[id]
    if (!excludedParts || feature.geometry.type !== 'MultiPolygon') return [feature]

    const coordinates = feature.geometry.coordinates.filter((_, index) => !excludedParts.has(index))
    if (coordinates.length === 0) return []

    return [{
      ...feature,
      geometry: { ...feature.geometry, coordinates },
    }]
  })
}
