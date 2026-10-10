export type MunicipalityCsvRow = {
  code: string
  value: number
  line: number
}

type CsvRecord = {
  fields: string[]
  line: number
}

function readRecords(text: string): CsvRecord[] {
  const records: CsvRecord[] = []
  let fields: string[] = []
  let field = ''
  let quoted = false
  let line = 1
  let recordLine = 1

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
      } else {
        field += character
        if (character === '\n') line += 1
      }
      continue
    }

    if (character === '"' && field.length === 0) {
      quoted = true
    } else if (character === ',') {
      fields.push(field)
      field = ''
    } else if (character === '\r' || character === '\n') {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      fields.push(field)
      records.push({ fields, line: recordLine })
      fields = []
      field = ''
      line += 1
      recordLine = line
    } else {
      field += character
    }
  }

  if (quoted) throw new Error('CSVの引用符が閉じられていません。')
  if (field.length > 0 || fields.length > 0) {
    fields.push(field)
    records.push({ fields, line: recordLine })
  }

  return records
}

export function parseMunicipalityCsv(text: string) {
  const records = readRecords(text.replace(/^\uFEFF/, ''))
  const header = records.shift()
  if (!header) throw new Error('CSVに見出し行がありません。')
  if (header.fields.length !== 2) {
    throw new Error('CSVは「市区町村コード」と「値」の2列にしてください。')
  }

  const codeColumn = header.fields.findIndex((field) => field.trim() === '市区町村コード')
  const valueColumn = header.fields.findIndex((field) => field.trim() === '値')
  if (codeColumn < 0 || valueColumn < 0) {
    throw new Error('1行目に「市区町村コード」と「値」の見出しが必要です。')
  }

  const rows: MunicipalityCsvRow[] = []
  const errors: string[] = []
  const seenCodes = new Set<string>()

  for (const record of records) {
    if (record.fields.every((field) => field.trim() === '')) continue
    if (record.fields.length !== header.fields.length) {
      errors.push(`${record.line}行目: 列数が見出し行と一致しません。`)
      continue
    }

    const rawCode = (record.fields[codeColumn] ?? '').trim().normalize('NFKC')
    const code = /^\d{1,5}$/.test(rawCode) ? rawCode.padStart(5, '0') : ''
    const rawValue = (record.fields[valueColumn] ?? '').trim().normalize('NFKC')
    const value = rawValue === '' ? Number.NaN : Number(rawValue)

    if (!code) {
      errors.push(`${record.line}行目: 市区町村コードは1〜5桁の数字で入力してください。`)
      continue
    }
    if (!Number.isFinite(value)) {
      errors.push(`${record.line}行目: 値は数値で入力してください。`)
      continue
    }
    if (seenCodes.has(code)) {
      errors.push(`${record.line}行目: 市区町村コード ${code} が重複しています。`)
      continue
    }

    seenCodes.add(code)
    rows.push({ code, value, line: record.line })
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push('値が入力されたデータ行がありません。')
  }

  return { rows, errors }
}

export async function decodeMunicipalityCsv(file: File) {
  const bytes = await file.arrayBuffer()
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('shift_jis').decode(bytes)
  }
}
