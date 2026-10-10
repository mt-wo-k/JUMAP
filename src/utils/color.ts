export const MAP_BACKGROUND = '#24272d'

function parseHex(hex: string) {
  const normalized = hex.replace('#', '')
  const full = normalized.length === 3
    ? normalized.split('').map((digit) => `${digit}${digit}`).join('')
    : normalized

  return [0, 2, 4].map((offset) => Number.parseInt(full.slice(offset, offset + 2), 16))
}

export function blendColors(start: string, end: string, amount: number) {
  const t = Math.min(1, Math.max(0, amount))
  const from = parseHex(start)
  const to = parseHex(end)
  const rgb = from.map((channel, index) => Math.round(channel + (to[index] - channel) * t))
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

export function colorForValue(value: number | null, min: number, max: number, maxColor: string) {
  if (value === null || !Number.isFinite(value)) return MAP_BACKGROUND
  if (max === min) return maxColor
  return blendColors(MAP_BACKGROUND, maxColor, (value - min) / (max - min))
}
