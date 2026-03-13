import { describe, it, expect } from 'vitest'
import { formatTime } from './formatters'

describe('formatTime', () => {
  it('formate correctement une date standard', () => {
    const date = new Date('2025-01-01T12:34:56')
    expect(formatTime(date)).toBe('12:34')
  })

  it('formate correctement une date avec des heures et minutes à un seul chiffre', () => {
    const date = new Date('2025-01-01T08:05:00')
    expect(formatTime(date)).toBe('08:05')
  })

  it('retourne une chaîne vide pour une valeur null', () => {
    expect(formatTime(null)).toBe('')
  })

  it('retourne une chaîne vide pour une valeur undefined', () => {
    expect(formatTime(undefined)).toBe('')
  })

  it('retourne une chaîne vide pour une date invalide', () => {
    expect(formatTime(new Date('invalid'))).toBe('')
  })

  it('retourne une chaîne vide pour un type incorrect', () => {
    expect(formatTime('2025-01-01')).toBe('')
    expect(formatTime(123456789)).toBe('')
    expect(formatTime({})).toBe('')
  })
})
