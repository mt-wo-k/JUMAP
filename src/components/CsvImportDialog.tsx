import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { decodeMunicipalityCsv, parseMunicipalityCsv, type MunicipalityCsvRow } from '@/utils/municipalityCsv'
import { FileUp } from 'lucide-react'
import { useRef, useState } from 'react'

type Props = {
  areaIds: Set<string>
  onClose: () => void
  onImport: (rows: MunicipalityCsvRow[]) => void
}

export default function CsvImportDialog({ areaIds, onClose, onImport }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<MunicipalityCsvRow[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [isReading, setIsReading] = useState(false)

  const matchedRows = rows.filter((row) => areaIds.has(row.code))
  const skippedCount = rows.length - matchedRows.length

  async function selectFile(file?: File) {
    if (!file) return
    setFileName(file.name)
    setRows([])
    setErrors([])
    setIsReading(true)
    try {
      const parsed = parseMunicipalityCsv(await decodeMunicipalityCsv(file))
      setRows(parsed.rows)
      setErrors(parsed.errors)
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'CSVを読み込めませんでした。'])
    } finally {
      setIsReading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">CSVから値を取り込む</DialogTitle>
          <DialogDescription>
            市区町村コードを地図上の地域コードと照合し、値を一括で反映します。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border/80 bg-secondary/40 p-3 text-xs leading-6 text-muted-foreground">
            <p className="font-medium text-foreground">CSVの形式</p>
            <code className="block text-foreground">市区町村コード,値</code>
            <code className="block">13101,250000</code>
            <p className="mt-1">先頭の0を含む5桁コードを使用してください。文字コードはUTF-8またはShift_JISに対応しています。</p>
          </div>

          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept=".csv,text/csv"
            aria-label="CSVファイルを選択"
            onChange={(event) => {
              void selectFile(event.target.files?.[0])
              event.target.value = ''
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start gap-2"
            disabled={isReading}
            onClick={() => inputRef.current?.click()}
          >
            <FileUp size={16} aria-hidden="true" />
            {isReading ? 'CSVを読み込んでいます…' : fileName || 'CSVファイルを選択'}
          </Button>

          {rows.length > 0 && (
            <div className="rounded-lg border border-border/80 p-3 text-sm">
              <p>読み込み行数：<strong>{rows.length.toLocaleString()}件</strong></p>
              <p className="mt-1">このマップに反映：<strong>{matchedRows.length.toLocaleString()}件</strong></p>
              {skippedCount > 0 && (
                <p className="mt-1 text-muted-foreground">対象外のコード：{skippedCount.toLocaleString()}件（現在のマップに含まれない地域）</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">CSVに含まれる地域の値を更新します。ファイルにない地域やメモはそのまま残ります。</p>
            </div>
          )}

          {errors.length > 0 && (
            <div role="alert" className="max-h-32 overflow-y-auto rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs leading-5 text-destructive">
              {errors.slice(0, 8).map((error) => <p key={error}>{error}</p>)}
              {errors.length > 8 && <p>ほか{errors.length - 8}件のエラー</p>}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose}>キャンセル</Button>
          <Button
            type="button"
            disabled={isReading || errors.length > 0 || matchedRows.length === 0}
            onClick={() => onImport(matchedRows)}
          >
            {matchedRows.length.toLocaleString()}件を反映
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
