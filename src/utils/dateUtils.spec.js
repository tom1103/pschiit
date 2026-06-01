import { describe, it, expect } from 'vitest'
import { formatTime } from './dateUtils'

// Ces tests vérifient que `dateUtils` ré-exporte bien l'implémentation robuste de
// `formatters`, garantissant un comportement identique pour tous les composants
// qui importent depuis `@/utils/dateUtils`.
describe('dateUtils.formatTime (délégation vers formatters)', () => {
  it('formate correctement une date standard', () => {
    expect(formatTime(new Date('2025-01-01T12:34:56'))).toBe('12:34')
  })

  it('retourne une chaîne vide pour null ou undefined', () => {
    expect(formatTime(null)).toBe('')
    expect(formatTime(undefined)).toBe('')
  })

  it('retourne une chaîne vide pour une date invalide', () => {
    expect(formatTime(new Date('invalid'))).toBe('')
  })

  it('retourne une chaîne vide pour un type incorrect', () => {
    expect(formatTime('2025-01-01')).toBe('')
    expect(formatTime(123456789)).toBe('')
  })
})
