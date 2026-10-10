import { lazy, Suspense, useEffect, useState } from 'react'
import MapSetupDialog from './components/MapSetupDialog'
import type { ChoroplethMap } from './domain/types'
import { loadMaps, saveMaps } from './storage/mapRepository'
import './App.css'

const MapScreen = lazy(() => import('./components/MapScreen'))

function filledAreaCount(map: ChoroplethMap) {
  return Object.values(map.areas).filter((area) => area.value !== null && Number.isFinite(area.value)).length
}

function MapMark() {
  return <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
}

function App() {
  const [maps, setMaps] = useState<ChoroplethMap[]>(loadMaps)
  const [activeMapId, setActiveMapId] = useState<string | null>(null)
  const [showSetup, setShowSetup] = useState(false)

  useEffect(() => saveMaps(maps), [maps])

  const activeMap = maps.find((map) => map.id === activeMapId)

  function saveMap(map: ChoroplethMap) {
    setMaps((current) => current.some((item) => item.id === map.id)
      ? current.map((item) => item.id === map.id ? map : item)
      : [map, ...current])
    setShowSetup(false)
    setActiveMapId(map.id)
  }

  function updateMap(updated: ChoroplethMap) {
    setMaps((current) => current.map((map) => map.id === updated.id ? updated : map))
  }

  function removeMap(map: ChoroplethMap) {
    if (!window.confirm(`「${map.name}」を削除しますか？入力した値とメモも削除されます。`)) return
    setMaps((current) => current.filter((item) => item.id !== map.id))
  }

  if (activeMap) {
    return (
      <Suspense fallback={<main className="page-loading"><span className="loader" />マップを準備しています</main>}>
        <MapScreen map={activeMap} onBack={() => setActiveMapId(null)} onUpdate={updateMap} />
      </Suspense>
    )
  }

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <a className="brand" href="#home" aria-label="JUMAP ホーム">
          <MapMark />
          <span>JUMAP</span>
        </a>
        <span className="local-badge"><span />この端末に保存中</span>
      </header>

      <section className="dashboard-content">
        <div className="welcome-row">
          <div className="welcome-copy">
            <p className="eyebrow">YOUR MAPS</p>
            <h1>データを、地図に。</h1>
            <p className="welcome-description">都道府県を選んで、地域ごとの数値を色で見渡せるマップを作成します。</p>
          </div>
          <button className="button button-primary create-button" type="button" onClick={() => setShowSetup(true)}>
            <span className="plus-sign">＋</span>新しいマップ
          </button>
        </div>

        {maps.length === 0 ? (
          <section className="empty-state">
            <div className="empty-illustration" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
            <h2>最初のマップを作成しましょう</h2>
            <p>表示する都道府県や単位、色を決めたら、地域をタップして値を入力できます。</p>
            <button className="button button-secondary" type="button" onClick={() => setShowSetup(true)}>マップを作成する</button>
          </section>
        ) : (
          <section className="map-library" aria-label="作成したマップ">
            <div className="section-heading"><h2>マップ一覧</h2><span>{maps.length}件</span></div>
            <div className="map-card-grid">
              {maps.map((map) => (
                <article className="map-card" key={map.id}>
                  <button className="map-card-open" type="button" onClick={() => setActiveMapId(map.id)}>
                    <span className="card-preview" aria-hidden="true">
                      <span className="preview-shape shape-one" style={{ background: map.maxColor }} />
                      <span className="preview-shape shape-two" style={{ background: map.maxColor, opacity: 0.72 }} />
                      <span className="preview-shape shape-three" style={{ background: map.maxColor, opacity: 0.48 }} />
                      <span className="preview-shape shape-four" style={{ background: map.maxColor, opacity: 0.28 }} />
                      <span className="preview-glow" style={{ background: map.maxColor }} />
                    </span>
                    <span className="card-content">
                      <span className="card-title-line"><strong>{map.name}</strong><span className="card-arrow">↗</span></span>
                      <span className="card-regions">{map.prefectureCodes.length} 都道府県{map.unit ? ` · ${map.unit}` : ''}</span>
                      <span className="card-foot"><span>{filledAreaCount(map)} 地域に入力済み</span><span>{new Date(map.updatedAt).toLocaleDateString('ja-JP')}</span></span>
                    </span>
                  </button>
                  <button className="card-delete" type="button" aria-label={`${map.name}を削除`} onClick={() => removeMap(map)}>削除</button>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>

      <footer className="dashboard-footer">
        <span>日本の市区町村と政令指定都市の行政区に対応</span>
        <span>入力データはこのブラウザーに保存されます</span>
      </footer>

      {showSetup && <MapSetupDialog onClose={() => setShowSetup(false)} onSave={saveMap} />}
    </main>
  )
}

export default App
