import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PREFECTURES } from "@/data/prefectures";
import type { ChoroplethMap } from "@/domain/types";
import { Check, CheckCheck, RotateCcw } from "lucide-react";
import { useState, type FormEvent } from "react";

type Props = {
  initialMap?: ChoroplethMap;
  onClose: () => void;
  onSave: (map: ChoroplethMap) => void;
};

export default function MapSetupDialog({ initialMap, onClose, onSave }: Props) {
  const [name, setName] = useState(initialMap?.name ?? "");
  const [unit, setUnit] = useState(initialMap?.unit ?? "");
  const [maxColor, setMaxColor] = useState(initialMap?.maxColor ?? "#e26a51");
  const [invertColorScale, setInvertColorScale] = useState(
    initialMap?.invertColorScale ?? false,
  );
  const [prefectureCodes, setPrefectureCodes] = useState<string[]>(
    initialMap?.prefectureCodes ?? [],
  );

  function togglePrefecture(code: string) {
    setPrefectureCodes((current) =>
      current.includes(code)
        ? current.filter((item) => item !== code)
        : [...current, code].sort(),
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const now = new Date().toISOString();
    const retainedAreas = Object.fromEntries(
      Object.entries(initialMap?.areas ?? {}).filter(([areaId]) =>
        prefectureCodes.some((code) => areaId.startsWith(code)),
      ),
    );
    onSave({
      id: initialMap?.id ?? crypto.randomUUID(),
      name: name.trim(),
      prefectureCodes,
      unit: unit.trim(),
      maxColor,
      invertColorScale,
      areas: retainedAreas,
      createdAt: initialMap?.createdAt ?? now,
      updatedAt: now,
    });
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 border-b border-border/70 px-5 py-4 pr-14 sm:px-6">
          <DialogTitle className="text-xl">
            {initialMap ? "マップ設定" : "新しいマップ"}
          </DialogTitle>
        </DialogHeader>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
          <div className="dialog-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-3 sm:px-6">
          <label className="grid gap-2 text-sm font-medium" htmlFor="map-name">
            マップ名
            <Input
              id="map-name"
              autoFocus
              required
              maxLength={48}
              placeholder="例：営業所別売上"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="grid content-start gap-2 text-sm font-medium">
              単位（任意）
              <Input
                maxLength={12}
                placeholder="円、km、% など"
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
              />
            </label>
            <label className="grid content-start gap-2 text-sm font-medium">
              {invertColorScale ? "最小値の色" : "最大値の色"}
              <span className="flex h-10 items-center gap-3 rounded-lg border border-input bg-input/30 px-2">
                <input
                  className="size-7 cursor-pointer rounded border-0 bg-transparent p-0"
                  aria-label={invertColorScale ? "最小値の色" : "最大値の色"}
                  type="color"
                  value={maxColor}
                  onChange={(event) => setMaxColor(event.target.value)}
                />
                <code className="text-xs font-medium tracking-wider text-muted-foreground">
                  {maxColor.toUpperCase()}
                </code>
              </span>
            </label>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-border/80 bg-secondary/40 px-4 py-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">色の濃さを反転</p>
              <p className="text-xs text-muted-foreground">
                {invertColorScale
                  ? "小さい値ほど濃く表示"
                  : "大きい値ほど濃く表示"}
              </p>
            </div>
            <Switch
              aria-label="色の濃さを反転"
              checked={invertColorScale}
              onCheckedChange={setInvertColorScale}
            />
          </div>

          <section aria-labelledby="prefecture-heading">
            <div className="flex items-center justify-between gap-3">
              <h3 id="prefecture-heading" className="text-sm font-medium">
                表示する都道府県
              </h3>
              <span className="text-xs tabular-nums text-muted-foreground">
                {prefectureCodes.length} / 47
              </span>
            </div>
            <div className="mt-2 flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() =>
                  setPrefectureCodes(PREFECTURES.map(([code]) => code))
                }
              >
                <CheckCheck aria-hidden="true" />
                すべて選択
              </Button>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setPrefectureCodes([])}
              >
                <RotateCcw aria-hidden="true" />
                選択解除
              </Button>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 rounded-xl border border-border/70 bg-background/50 p-3 sm:grid-cols-4">
              {PREFECTURES.map(([code, prefecture]) => {
                const checked = prefectureCodes.includes(code);
                return (
                  <Button
                    aria-pressed={checked}
                    className="h-9 min-w-0 justify-start gap-1.5 px-2 text-xs"
                    key={code}
                    onClick={() => togglePrefecture(code)}
                    size="sm"
                    type="button"
                    variant={checked ? "secondary" : "ghost"}
                  >
                    {checked ? (
                      <Check className="text-primary" aria-hidden="true" />
                    ) : (
                      <span className="size-4 shrink-0" aria-hidden="true" />
                    )}
                    <span className="truncate">{prefecture}</span>
                  </Button>
                );
              })}
            </div>
            {prefectureCodes.length === 0 && (
              <p className="mt-2 text-xs text-destructive">
                表示する都道府県を1つ以上選択してください。
              </p>
            )}
          </section>

          </div>
          <DialogFooter className="mx-0 mb-0 shrink-0 flex-col-reverse rounded-b-xl border-t border-border/70 bg-muted/50 px-5 py-4 sm:flex-row sm:px-6">
            <Button variant="outline" type="button" onClick={onClose}>
              キャンセル
            </Button>
            <Button
              disabled={!name.trim() || prefectureCodes.length === 0}
              type="submit"
            >
              {initialMap ? "設定を保存" : "マップを作成"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
