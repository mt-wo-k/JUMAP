import { describe, expect, it } from 'vitest'
import { blendColors, colorForValue, MAP_BACKGROUND } from './color'

describe('blendColors', () => {
  it('interpolates from the background to the selected color', () => {
    expect(blendColors('#000000', '#ffffff', 0.5)).toBe('#808080')
  })

  it('clamps interpolation amounts and accepts shorthand hex colors', () => {
    expect(blendColors('#000', '#fff', -1)).toBe('#000000')
    expect(blendColors('#000', '#fff', 2)).toBe('#ffffff')
  })
})

describe('colorForValue', () => {
  const maxColor = '#ff6b4a'

  it('uses the background for empty values and the selected color for the maximum', () => {
    expect(colorForValue(null, 1, 10, maxColor)).toBe(MAP_BACKGROUND)
    expect(colorForValue(10, 1, 10, maxColor)).toBe(maxColor)
  })

  it('maps values between the minimum and maximum to relative colors', () => {
    expect(colorForValue(1, 1, 10, maxColor)).toBe(MAP_BACKGROUND)
    expect(colorForValue(5.5, 1, 10, maxColor)).toBe('#92493c')
  })

  it('uses the selected endpoint when all filled areas have the same value', () => {
    expect(colorForValue(7, 7, 7, maxColor)).toBe(maxColor)
  })
})
