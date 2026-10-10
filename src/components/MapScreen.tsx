import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { loadMunicipalities } from "@/data/municipalities";
import { PREFECTURE_NAME_BY_CODE } from "@/data/prefectures";
import type { AreaFeature, AreaValue, ChoroplethMap } from "@/domain/types";
import { colorForValue, VALUE_MIN_COLOR } from "@/utils/color";
import type { Feature, FeatureCollection, GeoJsonObject } from "geojson";
import L, { type PathOptions } from "leaflet";
import { ChevronLeft, Cloud, CloudOff, LoaderCircle, Settings2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { GeoJSON, MapContainer, useMap, ZoomControl } from "react-leaflet";
import type { SyncStatus } from "@/sync/syncClient";
import MapSetupDialog from "./MapSetupDialog";

type Props = {
  map: ChoroplethMap;
  onBack: () => void;
  onUpdate: (map: ChoroplethMap) => void;
  syncStatus: SyncStatus;
  onSyncSettings: () => void;
};

function FitBounds({ data }: { data: FeatureCollection }) {
  const map = useMap();

  useEffect(() => {
    const bounds = L.geoJSON(data as GeoJsonObject).getBounds();
    if (bounds.isValid())
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 8, animate: false });
  }, [data, map]);

  return null;
}

function displayAreaName(feature: Feature) {
  const properties = feature.properties ?? {};
  return String(
    properties.displayName ?? properties.municipality ?? "名称未設定",
  );
}

function featureId(feature: Feature) {
  return String(feature.id ?? "");
}

function valueForArea(areas: Record<string, AreaValue>, id: string) {
  return areas[id]?.value ?? null;
}

export default function MapScreen({ map, onBack, onUpdate, syncStatus, onSyncSettings }: Props) {
  const [boundaryState, setBoundaryState] = useState<{
    key: string;
    features: AreaFeature[];
    prefectureOutlines: Feature[];
    error: string;
  } | null>(null);
  const [selectedArea, setSelectedArea] = useState<AreaFeature | null>(null);
  const [editingSettings, setEditingSettings] = useState(false);
  const [draftValue, setDraftValue] = useState("");
  const [draftMemo, setDraftMemo] = useState("");

  const prefectureCodesKey = map.prefectureCodes.join(",");
  const currentBoundaryState =
    boundaryState?.key === prefectureCodesKey ? boundaryState : null;
  const features = currentBoundaryState?.features ?? null;
  const prefectureOutlines = currentBoundaryState?.prefectureOutlines ?? [];
  const loadError = currentBoundaryState?.error ?? "";

  useEffect(() => {
    let active = true;
    loadMunicipalities(prefectureCodesKey.split(",").filter(Boolean))
      .then(
        (result) =>
          active &&
          setBoundaryState({ key: prefectureCodesKey, ...result, error: "" }),
      )
      .catch(
        (error: unknown) =>
          active &&
          setBoundaryState({
            key: prefectureCodesKey,
            features: [],
            prefectureOutlines: [],
            error:
              error instanceof Error
                ? error.message
                : "境界データを読み込めませんでした。",
          }),
      );
    return () => {
      active = false;
    };
  }, [prefectureCodesKey]);

  const featuresByPrefecture = useMemo(() => {
    const grouped = new Map<string, FeatureCollection>();
    if (!features) return grouped;

    const featureGroups = new Map<string, Feature[]>();
    for (const feature of features) {
      const name = String(feature.properties.prefecture ?? "");
      if (!name) continue;
      const group = featureGroups.get(name);
      if (group) group.push(feature as Feature);
      else featureGroups.set(name, [feature as Feature]);
    }
    for (const [name, prefectureFeatures] of featureGroups) {
      grouped.set(name, {
        type: "FeatureCollection",
        features: prefectureFeatures,
      });
    }
    return grouped;
  }, [features]);

  const { numericValues, minValue, maxValue } = useMemo(() => {
    const values: number[] = [];
    let minimum = Number.POSITIVE_INFINITY;
    let maximum = Number.NEGATIVE_INFINITY;
    for (const feature of features ?? []) {
      const value = valueForArea(map.areas, featureId(feature as Feature));
      if (value === null || !Number.isFinite(value)) continue;
      values.push(value);
      minimum = Math.min(minimum, value);
      maximum = Math.max(maximum, value);
    }
    return {
      numericValues: values,
      minValue: values.length ? minimum : 0,
      maxValue: values.length ? maximum : 0,
    };
  }, [features, map.areas]);

  const mapData = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: (features ?? []) as Feature[],
    }),
    [features],
  );

  function openArea(feature: AreaFeature) {
    const saved = map.areas[featureId(feature as Feature)];
    setDraftValue(
      saved?.value === null || saved?.value === undefined
        ? ""
        : String(saved.value),
    );
    setDraftMemo(saved?.memo ?? "");
    setSelectedArea(feature);
  }

  function saveArea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedArea) return;
    const id = featureId(selectedArea as Feature);
    const value = draftValue.trim() === "" ? null : Number(draftValue);
    if (value !== null && !Number.isFinite(value)) return;
    const areas = { ...map.areas, [id]: { value, memo: draftMemo } };
    onUpdate({ ...map, areas, updatedAt: new Date().toISOString() });
    setSelectedArea(null);
  }

  const unitLabel = map.unit ? ` ${map.unit}` : "";
  return (
    <main className="flex h-dvh min-h-[420px] flex-col overflow-hidden bg-background">
      <header className="grid h-16 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-border/80 px-3 sm:px-6">
        <Button
          className="w-fit gap-1 px-2 sm:px-3"
          variant="ghost"
          onClick={onBack}
        >
          <ChevronLeft size={19} aria-hidden="true" />
          <span>マップ一覧</span>
        </Button>
        <div className="min-w-0 text-center">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-primary sm:text-xs">
            COLOR MAP
          </p>
          <h1 className="max-w-[45vw] truncate text-sm font-semibold sm:max-w-md sm:text-base">
            {map.name}
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`端末間同期: ${syncStatus === "synced" ? "同期済み" : syncStatus === "syncing" ? "同期中" : syncStatus === "error" ? "同期エラー" : "未設定"}`}
            title={`端末間同期: ${syncStatus === "synced" ? "同期済み" : syncStatus === "syncing" ? "同期中" : syncStatus === "error" ? "同期エラー" : "未設定"}`}
            onClick={onSyncSettings}
          >
            {syncStatus === "syncing" ? (
              <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />
            ) : syncStatus === "error" || syncStatus === "required" ? (
              <CloudOff size={18} aria-hidden="true" />
            ) : (
              <Cloud size={18} aria-hidden="true" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="マップ設定"
            onClick={() => setEditingSettings(true)}
          >
            <Settings2 size={19} aria-hidden="true" />
          </Button>
        </div>
      </header>

      <section
        className="relative min-h-0 flex-1 overflow-hidden bg-[#1c2027]"
        aria-label="色塗りマップ"
      >
        {features && (
          <MapContainer
            className="absolute inset-0 h-full w-full"
            center={[36.2, 138.25]}
            zoom={5}
            zoomControl={false}
            scrollWheelZoom
          >
            <ZoomControl position="bottomright" />
            <FitBounds data={mapData} />
            {map.prefectureCodes.map((code) => {
              const prefectureName = PREFECTURE_NAME_BY_CODE.get(code);
              const collection = prefectureName
                ? featuresByPrefecture.get(prefectureName)
                : undefined;
              if (!collection) return null;
              return (
                <GeoJSON
                  data={collection}
                  key={code}
                  onEachFeature={(feature, layer) =>
                    layer.on("click", () => openArea(feature as AreaFeature))
                  }
                  style={(feature): PathOptions => {
                    const id = feature ? featureId(feature as Feature) : "";
                    const value = valueForArea(map.areas, id);
                    return {
                      color: "#555d69",
                      weight: 0.75,
                      opacity: 0.9,
                      fillColor: colorForValue(
                        value,
                        minValue,
                        maxValue,
                        map.maxColor,
                        map.invertColorScale,
                      ),
                      fillOpacity: 1,
                      interactive: true,
                    };
                  }}
                />
              );
            })}
            {prefectureOutlines.map((outline, index) => (
              <GeoJSON
                data={outline}
                key={`prefecture-outline-${index}`}
                style={{
                  color: "#c1c8d4",
                  weight: 1.15,
                  opacity: 0.96,
                  fill: false,
                  interactive: false,
                }}
              />
            ))}
          </MapContainer>
        )}

        {!features && !loadError && (
          <div className="absolute inset-0 grid place-items-center gap-3 text-sm text-muted-foreground">
            <span
              className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent"
              aria-hidden="true"
            />
            境界データを読み込んでいます
          </div>
        )}
        {loadError && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div className="max-w-md rounded-xl border border-destructive/40 bg-background/95 p-5 shadow-xl">
              <strong className="block text-sm">地図を表示できません</strong>
              <span className="mt-2 block text-sm text-muted-foreground">
                {loadError}
              </span>
            </div>
          </div>
        )}
      </section>

      {features && (
        <section
          className="shrink-0 border-t border-border/80 bg-card px-4 py-3 sm:px-6"
          aria-label="値の色分け"
        >
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center justify-between gap-4 text-xs">
              <strong className="font-medium text-foreground">
                {numericValues.length} / {features.length} 地域に入力済み
              </strong>
            </div>
            <div
              className="mt-2 h-2 rounded-full ring-1 ring-inset ring-white/10"
              style={{
                background: `linear-gradient(90deg, ${map.invertColorScale ? map.maxColor : VALUE_MIN_COLOR}, ${map.invertColorScale ? VALUE_MIN_COLOR : map.maxColor})`,
              }}
            />
            <div className="mt-1.5 flex justify-between gap-4 text-xs tabular-nums text-muted-foreground">
              <span>
                {numericValues.length
                  ? `${minValue.toLocaleString()}${unitLabel}`
                  : "—"}
              </span>
              <span>
                {numericValues.length
                  ? `${maxValue.toLocaleString()}${unitLabel}`
                  : "—"}
              </span>
            </div>
          </div>
        </section>
      )}

      <footer className="flex shrink-0 flex-col gap-1 border-t border-border/70 bg-background px-4 py-2.5 text-[10px] leading-4 text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-xs">
        <span className="line-clamp-1">
          {map.prefectureCodes
            .map((code) => PREFECTURE_NAME_BY_CODE.get(code))
            .join("・")}
        </span>
        <span>境界データ：共同通信「japan-choropleth」／国土数値情報 2025</span>
      </footer>

      <Dialog
        open={Boolean(selectedArea)}
        onOpenChange={(open) => {
          if (!open) setSelectedArea(null);
        }}
      >
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="shrink-0 border-b border-border/70 px-5 py-5 pr-14">
            <p className="text-xs font-semibold tracking-[0.2em] text-primary">
              AREA DETAILS
            </p>
            <DialogTitle className="text-xl">
              {selectedArea ? displayAreaName(selectedArea as Feature) : ""}
            </DialogTitle>
            <DialogDescription>
              {selectedArea?.properties.prefecture ?? ""}
            </DialogDescription>
          </DialogHeader>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={saveArea}>
            <div className="dialog-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5">
            <label
              className="grid gap-2 text-sm font-medium"
              htmlFor="area-value"
            >
              値
              {map.unit && (
                <span className="text-xs font-normal text-muted-foreground">
                  単位：{map.unit}
                </span>
              )}
              <Input
                id="area-value"
                type="number"
                step="any"
                inputMode="decimal"
                placeholder="未入力"
                value={draftValue}
                onChange={(event) => setDraftValue(event.target.value)}
              />
            </label>
            <label
              className="grid gap-2 text-sm font-medium"
              htmlFor="area-memo"
            >
              メモ
              <Textarea
                id="area-memo"
                maxLength={1000}
                placeholder="任意のメモを入力できます"
                value={draftMemo}
                onChange={(event) => setDraftMemo(event.target.value)}
              />
            </label>
            </div>
            <DialogFooter className="mx-0 mb-0 shrink-0 flex-col-reverse rounded-b-xl border-t border-border/70 bg-muted/50 px-5 py-4 sm:flex-row">
              <Button
                variant="outline"
                type="button"
                onClick={() => setSelectedArea(null)}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={
                  draftValue.trim() !== "" &&
                  !Number.isFinite(Number(draftValue))
                }
              >
                保存
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {editingSettings && (
        <MapSetupDialog
          initialMap={map}
          onClose={() => setEditingSettings(false)}
          onSave={(updated) => {
            onUpdate(updated);
            setEditingSettings(false);
          }}
        />
      )}
    </main>
  );
}
