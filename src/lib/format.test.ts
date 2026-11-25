import { describe, expect, it } from 'vitest'
import { basketDeltaClass, formatNumber, formatPct } from './format'

describe('formatNumber', () => {
  it('pads to fixed decimals', () => {
    expect(formatNumber(1, 2)).toBe('1.00')
    expect(formatNumber(12.345, 2)).toBe('12.35')
  })
})

describe('formatPct', () => {
  it('handles null and signs', () => {
    expect(formatPct(null)).toBe('—')
    expect(formatPct(2.5)).toBe('+2.5%')
    expect(formatPct(-1.2)).toBe('-1.2%')
  })
})

describe('basketDeltaClass', () => {
  it('treats wage deltas inversely to costs', () => {
    expect(basketDeltaClass(-5, 'burgerMeal')).toContain('emerald')
    expect(basketDeltaClass(-5, 'avgMonthlyNetSalary')).toContain('coral')
  })
})
