import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Cloud, CloudOff, LoaderCircle, MapPinned, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import MapSetupDialog from '@/components/MapSetupDialog'
import SyncSettingsDialog from '@/components/SyncSettingsDialog'
import type { ChoroplethMap } from '@/domain/types'
import { loadMaps, saveMaps } from '@/storage/mapRepository'
import {
  loadSyncKey,
  readCloudMaps,
  removeSyncKey,
  saveSyncKey,
  syncErrorMessage,
  writeCloudMaps,
  type SyncStatus,
} from '@/sync/syncClient'
import './App.css'

const MapScreen = lazy(() => import('@/components/MapScreen'))

function filledAreaCount(map: ChoroplethMap) {
  return Object.values(map.areas).filter((area) => area.value !== null && Number.isFinite(area.value)).length
}

function App() {
  const [maps, setMaps] = useState<ChoroplethMap[]>(loadMaps)
  const [activeMapId, setActiveMapId] = useState<string | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [syncKey, setSyncKey] = useState(loadSyncKey)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => syncKey ? 'syncing' : 'required')
  const [syncError, setSyncError] = useState('')
  const [syncReady, setSyncReady] = useState(false)
  const [syncRetry, setSyncRetry] = useState(0)
  const [showSyncSettings, setShowSyncSettings] = useState(false)
  const mapsRef = useRef(maps)

  useEffect(() => saveMaps(maps), [maps])
  useEffect(() => {
    mapsRef.current = maps
  }, [maps])

  useEffect(() => {
    if (!syncKey) {
      return
    }

    let active = true

    async function initializeSync() {
      try {
        const cloudMaps = await readCloudMaps(syncKey)
        if (!active) return

        // The first device seeds an empty cloud snapshot. Later devices use the cloud copy.
        const initialMaps = cloudMaps ?? mapsRef.current
        if (cloudMaps === null) await writeCloudMaps(syncKey, initialMaps)
        if (!active) return

        saveMaps(initialMaps)
        setMaps(initialMaps)
        setSyncReady(true)
        setSyncStatus('synced')
      } catch (error) {
        if (!active) return
        setSyncError(syncErrorMessage(error))
        setSyncStatus('error')
      }
    }

    void initializeSync()
    return () => {
      active = false
    }
  }, [syncKey, syncRetry])

  useEffect(() => {
    if (!syncKey || !syncReady) return

    let active = true
    const timer = window.setTimeout(async () => {
      setSyncStatus('syncing')
      setSyncError('')
      try {
        await writeCloudMaps(syncKey, maps)
        if (active) setSyncStatus('synced')
      } catch (error) {
        if (!active) return
        setSyncError(syncErrorMessage(error))
        setSyncStatus('error')
      }
    }, 700)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [maps, syncKey, syncReady])

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

  function handleSaveSyncKey(key: string) {
    saveSyncKey(key)
    setSyncKey(key)
    setSyncReady(false)
    setSyncStatus('syncing')
    setSyncError('')
    setSyncRetry((count) => count + 1)
  }

  function handleClearSyncKey() {
    removeSyncKey()
    setSyncKey('')
    setSyncReady(false)
    setSyncStatus('required')
    setSyncError('')
  }

  function handleRetrySync() {
    setSyncReady(false)
    setSyncStatus('syncing')
    setSyncError('')
    setSyncRetry((count) => count + 1)
  }

  function syncLabel() {
    if (syncStatus === 'syncing') return '同期中'
    if (syncStatus === 'synced') return '同期済み'
    if (syncStatus === 'error') return '同期エラー'
    return '同期を設定'
  }

  function syncIcon() {
    if (syncStatus === 'syncing') return <LoaderCircle className="animate-spin" size={15} aria-hidden="true" />
    if (syncStatus === 'error' || syncStatus === 'required') return <CloudOff size={15} aria-hidden="true" />
    return <Cloud size={15} aria-hidden="true" />
  }

  if (activeMap) {
    return (
      <>
        <Suspense fallback={
          <main className="grid min-h-dvh place-items-center gap-3 bg-background text-sm text-muted-foreground">
            <span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
            マップを準備しています
          </main>
        }>
          <MapScreen
            map={activeMap}
            onBack={() => setActiveMapId(null)}
            onUpdate={updateMap}
            syncStatus={syncStatus}
            onSyncSettings={() => setShowSyncSettings(true)}
          />
        </Suspense>
        <SyncSettingsDialog
          open={showSyncSettings}
          syncKey={syncKey}
          status={syncStatus}
          errorMessage={syncError}
          onClose={() => setShowSyncSettings(false)}
          onSaveKey={handleSaveSyncKey}
          onClearKey={handleClearSyncKey}
          onRetry={handleRetrySync}
        />
      </>
    )
  }

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/70 px-5 sm:px-8">
        <a className="flex items-center gap-2.5 font-semibold tracking-[0.12em] text-foreground" href="#home" aria-label="JUMAP ホーム">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
            <MapPinned size={20} strokeWidth={1.8} aria-hidden="true" />
          </span>
          JUMAP
        </a>
        <Button
          className="gap-2"
          variant="outline"
          size="sm"
          onClick={() => setShowSyncSettings(true)}
          aria-label={`同期設定。現在の状態: ${syncLabel()}`}
        >
          {syncIcon()}
          {syncLabel()}
        </Button>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
        <section className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-primary">YOUR MAPS</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">データを、地図に。</h1>
            <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
              都道府県を選んで、地域ごとの数値を色で見渡せるマップを作成します。
            </p>
          </div>
          <Button className="h-11 w-full gap-2 px-4 sm:w-auto" onClick={() => setShowSetup(true)}>
            <Plus size={18} aria-hidden="true" />
            新しいマップ
          </Button>
        </section>

        {maps.length === 0 ? (
          <Card className="mt-12 flex min-h-72 flex-col items-center justify-center border-dashed bg-card/60 px-6 py-12 text-center sm:mt-16">
            <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <MapPinned size={27} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-lg font-semibold">最初のマップを作成しましょう</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              表示する都道府県や単位、色を決めたら、地域をタップして値を入力できます。
            </p>
            <Button variant="secondary" className="mt-6" onClick={() => setShowSetup(true)}>
              マップを作成する
            </Button>
          </Card>
        ) : (
          <section className="mt-12 sm:mt-16" aria-label="作成したマップ">
            <div className="mb-5 flex items-center gap-3">
              <h2 className="text-lg font-semibold">マップ一覧</h2>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">{maps.length}件</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {maps.map((map) => (
                <Card className="group relative overflow-hidden p-0 transition-colors hover:border-primary/50" key={map.id}>
                  <Button
                    className="h-auto w-full flex-col rounded-none p-0 text-left whitespace-normal hover:bg-transparent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    type="button"
                    onClick={() => setActiveMapId(map.id)}
                    aria-label={`${map.name}を開く`}
                    variant="ghost"
                  >
                    <span className="relative flex h-32 w-full items-center justify-center overflow-hidden bg-[#1c2027]">
                      <span className="absolute size-28 -translate-x-8 translate-y-5 rotate-12 rounded-[32%] opacity-70" style={{ background: map.maxColor }} />
                      <span className="absolute size-20 translate-x-8 -translate-y-4 -rotate-12 rounded-[35%] opacity-45" style={{ background: map.maxColor }} />
                      <span className="absolute size-12 translate-x-1 translate-y-8 rotate-45 rounded-[30%] opacity-25" style={{ background: map.maxColor }} />
                      <MapPinned className="relative text-white/80 drop-shadow" size={30} strokeWidth={1.4} aria-hidden="true" />
                    </span>
                    <span className="flex w-full flex-col gap-2 p-4 pr-12">
                      <span className="flex items-center justify-between gap-3">
                        <strong className="truncate text-base font-semibold">{map.name}</strong>
                        <ArrowUpRight className="shrink-0 text-muted-foreground transition-colors group-hover:text-primary" size={17} aria-hidden="true" />
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {map.prefectureCodes.length} 都道府県{map.unit ? ` · ${map.unit}` : ''}
                      </span>
                      <span className="mt-2 flex items-center justify-between gap-3 border-t border-border/70 pt-3 text-xs text-muted-foreground">
                        <span>{filledAreaCount(map)} 地域に入力済み</span>
                        <span>{new Date(map.updatedAt).toLocaleDateString('ja-JP')}</span>
                      </span>
                    </span>
                  </Button>
                  <Button
                    className="absolute right-3 bottom-3 size-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                    variant="ghost"
                    size="icon"
                    type="button"
                    aria-label={`${map.name}を削除`}
                    onClick={() => removeMap(map)}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </Button>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>

      <footer className="flex flex-col gap-1 border-t border-border/70 px-5 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>日本の市区町村と政令指定都市の行政区に対応</span>
        <span>入力データはこのブラウザーに保存され、設定後はクラウドに同期されます</span>
      </footer>

      {showSetup && <MapSetupDialog onClose={() => setShowSetup(false)} onSave={saveMap} />}
      <SyncSettingsDialog
        open={showSyncSettings}
        syncKey={syncKey}
        status={syncStatus}
        errorMessage={syncError}
        onClose={() => setShowSyncSettings(false)}
        onSaveKey={handleSaveSyncKey}
        onClearKey={handleClearSyncKey}
        onRetry={handleRetrySync}
      />
    </main>
  )
}

export default App
