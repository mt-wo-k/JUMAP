import { useState, type FormEvent } from 'react'
import type { ChoroplethMap } from '../domain/types'
import { PREFECTURES } from '../data/prefectures'

type Props = {
  initialMap?: ChoroplethMap
  onClose: () => void
  onSave: (map: ChoroplethMap) => void
}

export default function MapSetupDialog({ initialMap, onClose, onSave }: Props) {
  const [name, setName] = useState(initialMap?.name ?? '')
  const [unit, setUnit] = useState(initialMap?.unit ?? '')
  const [maxColor, setMaxColor] = useState(initialMap?.maxColor ?? '#e26a51')
  const [prefectureCodes, setPrefectureCodes] = useState<string[]>(initialMap?.prefectureCodes ?? [])

  function togglePrefecture(code: string) {
    setPrefectureCodes((current) => current.includes(code)
      ? current.filter((item) => item !== code)
      : [...current, code].sort())
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const now = new Date().toISOString()
    onSave({
      id: initialMap?.id ?? crypto.randomUUID(),
      name: name.trim(),
      prefectureCodes,
      unit: unit.trim(),
      maxColor,
      areas: initialMap?.areas ?? {},
      createdAt: initialMap?.createdAt ?? now,
      updatedAt: now,
    })
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="setup-dialog" role="dialog" aria-modal="true" aria-labelledby="setup-title">
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">MAP SETUP</p>
            <h2 id="setup-title">{initialMap ? 'マップ設定' : '新しいマップ'}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="閉じる" onClick={onClose}>×</button>
        </div>

        <form onSubmit={submit}>
          <label className="field-label" htmlFor="map-name">マップ名</label>
          <input
            id="map-name"
            className="text-input"
            autoFocus
            required
            maxLength={48}
            placeholder="例：営業所別売上"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <div className="field-row">
            <label className="field-group">
              <span className="field-label">単位（任意）</span>
              <input className="text-input" maxLength={12} placeholder="円、km、% など" value={unit} onChange={(event) => setUnit(event.target.value)} />
            </label>
            <label className="field-group color-field">
              <span className="field-label">最大値の色</span>
              <span className="color-control">
                <input aria-label="最大値の色" type="color" value={maxColor} onChange={(event) => setMaxColor(event.target.value)} />
                <code>{maxColor.toUpperCase()}</code>
              </span>
            </label>
          </div>

          <div className="prefecture-heading">
            <span className="field-label">表示する都道府県</span>
            <span className="muted small">{prefectureCodes.length} / 47</span>
          </div>
          <div className="prefecture-actions">
            <button className="text-button" type="button" onClick={() => setPrefectureCodes(PREFECTURES.map(([code]) => code))}>すべて選択</button>
            <button className="text-button" type="button" onClick={() => setPrefectureCodes([])}>選択解除</button>
          </div>
          <div className="prefecture-grid">
            {PREFECTURES.map(([code, prefecture]) => {
              const checked = prefectureCodes.includes(code)
              return (
                <button
                  aria-pressed={checked}
                  className={`prefecture-chip${checked ? ' is-selected' : ''}`}
                  key={code}
                  onClick={() => togglePrefecture(code)}
                  type="button"
                >
                  <span className="chip-check">{checked ? '✓' : ''}</span>
                  {prefecture}
                </button>
              )
            })}
          </div>

          {prefectureCodes.length === 0 && <p className="form-error">表示する都道府県を1つ以上選択してください。</p>}
          <div className="dialog-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>キャンセル</button>
            <button className="button button-primary" disabled={!name.trim() || prefectureCodes.length === 0} type="submit">
              {initialMap ? '設定を保存' : 'マップを作成'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
