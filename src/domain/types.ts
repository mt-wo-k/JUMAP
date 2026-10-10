import type { Geometry } from 'geojson'

export type AreaValue = {
  value: number | null
  memo: string
}

export type ChoroplethMap = {
  id: string
  name: string
  prefectureCodes: string[]
  unit: string
  maxColor: string
  invertColorScale: boolean
  areas: Record<string, AreaValue>
  createdAt: string
  updatedAt: string
}

export type AreaProperties = {
  prefecture?: string
  municipality?: string
  ward?: string | null
  displayName?: string
  [key: string]: unknown
}

export type AreaFeature = {
  type: 'Feature'
  id?: string | number
  properties: AreaProperties
  geometry: Geometry
}
