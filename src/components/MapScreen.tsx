import { useEffect, useMemo, useState } from 'react'
import { GeoJSON, MapContainer, ZoomControl, useMap } from 'react-leaflet'
import L, { type PathOptions } from 'leaflet'
import type { Feature, FeatureCollection, GeoJsonObject } from 'geojson'
import type { ChoroplethMap, AreaValue, AreaFeature } from '../domain/types'
import { loadMunicipalities } from '../data/municipalities'
import { PREFECTURE_NAME_BY_CODE } from '../data/prefectures'
import { colorForValue, MAP_BACKGROUND } from '../utils/color'
import MapSetupDialog from './MapSetupDialog'

type Props = {
  map: ChoroplethMap
  onBack: () => void
  onUpdate: (map: ChoroplethMap) => void
}

function FitBounds({ data }: { data: FeatureCollection }) {
  const map = useMap()

  useEffect(() => {
    const bounds = L.geoJSON(data as GeoJsonObject).getBounds()
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [32, 32], maxZoom: 8, animate: false })
  }, [data, map])

  return null
}

function displayAreaName(feature: Feature) {
  const properties = feature.properties ?? {}
  return String(properties.displayName ?? properties.municipality ?? '名称未設定')
}

function featureId(feature: Feature) {
  return String(feature.id ?? '')
}

function valueForArea(areas: Record<string, AreaValue>, id: string) {
  return areas[id]?.value ?? null
}

export default function MapScreen({ map, onBack, onUpdate }: Props) {
  const [boundaryState, setBoundaryState] = useState<{ key: string; features: AreaFeature[]; error: string } | null>(null)
  const [selectedArea, setSelectedArea] = useState<AreaFeature | null>(null)
  const [editingSettings, setEditingSettings] = useState(false)
  const [draftValue, setDraftValue] = useState('')
  const [draftMemo, setDraftMemo] = useState('')

  const prefectureCodesKey = map.prefectureCodes.join(',')
  const currentBoundaryState = boundaryState?.key === prefectureCodesKey ? boundaryState : null
  const features = currentBoundaryState?.features ?? null
  const loadError = currentBoundaryState?.error ?? ''

  useEffect(() => {
    let active = true
    loadMunicipalities(prefectureCodesKey.split(',').filter(Boolean))
      .then((result) => active && setBoundaryState({ key: prefectureCodesKey, features: result, error: '' }))
      .catch((error: unknown) => active && setBoundaryState({
        key: prefectureCodesKey,
        features: [],
        error: error instanceof Error ? error.message : '境界データを読み込めませんでした。',
      }))
    return () => { active = false }
  }, [prefectureCodesKey])

  const numericValues = useMemo(() => {
    if (!features) return []
    return features
      .map((feature) => valueForArea(map.areas, featureId(feature as Feature)))
      .filter((value): value is number => value !== null && Number.isFinite(value))
  }, [features, map.areas])

  const minValue = numericValues.length ? Math.min(...numericValues) : 0
  const maxValue = numericValues.length ? Math.max(...numericValues) : 0
  const mapData = useMemo<FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: (features ?? []) as Feature[],
  }), [features])

  function openArea(feature: AreaFeature) {
    const saved = map.areas[featureId(feature as Feature)]
    setDraftValue(saved?.value === null || saved?.value === undefined ? '' : String(saved.value))
    setDraftMemo(saved?.memo ?? '')
    setSelectedArea(feature)
  }

  function saveArea() {
    if (!selectedArea) return
    const id = featureId(selectedArea as Feature)
    const value = draftValue.trim() === '' ? null : Number(draftValue)
    if (value !== null && !Number.isFinite(value)) return
    const areas = { ...map.areas, [id]: { value, memo: draftMemo } }
    const next = { ...map, areas, updatedAt: new Date().toISOString() }
    onUpdate(next)
    setSelectedArea(null)
  }

  const unitLabel = map.unit ? ` ${map.unit}` : ''

  return (
    <main className="map-page">
      <header className="map-topbar">
        <button className="back-button" type="button" onClick={onBack}>
          <span aria-hidden="true">‹</span><span>マップ一覧</span>
        </button>
        <div className="map-title-group">
          <p className="eyebrow">COLOR MAP</p>
          <h1>{map.name}</h1>
        </div>
        <button className="icon-button settings-button" type="button" aria-label="マップ設定" onClick={() => setEditingSettings(true)}>⚙</button>
      </header>

      <section className="map-workspace" aria-label="色塗りマップ">
        {features && <MapContainer className="map-canvas" center={[36.2, 138.25]} zoom={5} zoomControl={false} scrollWheelZoom>
          <ZoomControl position="bottomright" />
          <FitBounds data={mapData} />
          {map.prefectureCodes.map((code) => {
            const prefectureFeatures = features.filter((feature) => String(feature.properties.prefecture ?? '') === PREFECTURE_NAME_BY_CODE.get(code))
            if (prefectureFeatures.length === 0) return null
            const collection: FeatureCollection = { type: 'FeatureCollection', features: prefectureFeatures as Feature[] }
            return (
              <GeoJSON
                data={collection}
                key={code}
                onEachFeature={(feature, layer) => layer.on('click', () => openArea(feature as AreaFeature))}
                style={(feature): PathOptions => {
                  const id = feature ? featureId(feature as Feature) : ''
                  const value = valueForArea(map.areas, id)
                  return {
                    color: '#555b65',
                    weight: 0.8,
                    opacity: 0.9,
                    fillColor: colorForValue(value, minValue, maxValue, map.maxColor),
                    fillOpacity: 1,
                    interactive: true,
                  }
                }}
              />
            )
          })}
        </MapContainer>}

        {!features && !loadError && <div className="map-state"><span className="loader" />境界データを読み込んでいます</div>}
        {loadError && <div className="map-state error-state"><strong>地図を表示できません</strong><span>{loadError}</span></div>}

      </section>

      {features && <div className="map-legend" aria-label="値の色分け">
        <div className="legend-label"><span>相対値</span><strong>{numericValues.length} / {features.length} 地域に入力済み</strong></div>
        <div className="legend-ramp" style={{ background: `linear-gradient(90deg, ${MAP_BACKGROUND}, ${map.maxColor})` }} />
        <div className="legend-values"><span>{numericValues.length ? `${minValue.toLocaleString()}${unitLabel}` : '—'}</span><span>{numericValues.length ? `${maxValue.toLocaleString()}${unitLabel}` : '—'}</span></div>
      </div>}

      <footer className="map-footer">
        <span>{map.prefectureCodes.map((code) => PREFECTURE_NAME_BY_CODE.get(code)).join('・')}</span>
        <span>境界データ：共同通信「japan-choropleth」／国土数値情報 2025</span>
      </footer>

      {selectedArea && <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSelectedArea(null)}>
        <section className="area-dialog" role="dialog" aria-modal="true" aria-labelledby="area-title">
          <div className="dialog-heading">
            <div>
              <p className="eyebrow">AREA DETAILS</p>
              <h2 id="area-title">{displayAreaName(selectedArea as Feature)}</h2>
              <p className="muted">{selectedArea.properties.prefecture}</p>
            </div>
            <button className="icon-button" type="button" aria-label="閉じる" onClick={() => setSelectedArea(null)}>×</button>
          </div>

          <label className="field-label" htmlFor="area-value">値 <span className="unit-suffix">{map.unit}</span></label>
          <input
            id="area-value"
            className="text-input value-input"
            autoFocus
            type="number"
            step="any"
            inputMode="decimal"
            placeholder="未入力"
            value={draftValue}
            onChange={(event) => setDraftValue(event.target.value)}
          />
          <label className="field-label memo-label" htmlFor="area-memo">メモ（この画面でのみ表示）</label>
          <textarea id="area-memo" className="text-input memo-input" maxLength={1000} placeholder="任意のメモ" value={draftMemo} onChange={(event) => setDraftMemo(event.target.value)} />
          <div className="dialog-actions">
            <button className="button button-secondary" type="button" onClick={() => setSelectedArea(null)}>キャンセル</button>
            <button className="button button-primary" type="button" onClick={saveArea}>保存</button>
          </div>
        </section>
      </div>}

      {editingSettings && <MapSetupDialog
        initialMap={map}
        onClose={() => setEditingSettings(false)}
        onSave={(updated) => { onUpdate(updated); setEditingSettings(false) }}
      />}
    </main>
  )
}
