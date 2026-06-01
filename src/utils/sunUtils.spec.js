import { describe, it, expect } from 'vitest'
import { getMoonPhaseName, getMoonPhaseInfo, getDayLength, shiftDate } from './sunUtils'

describe('getMoonPhaseName', () => {
  it('retourne « Nouvelle lune » pour une phase de 0', () => {
    expect(getMoonPhaseName(0)).toBe('Nouvelle lune')
  })

  it('retourne « Pleine lune » pour une phase de 0.5', () => {
    expect(getMoonPhaseName(0.5)).toBe('Pleine lune')
  })

  it('retourne « Premier quartier » pour une phase de 0.25', () => {
    expect(getMoonPhaseName(0.25)).toBe('Premier quartier')
  })

  it('retourne « Dernier quartier » pour une phase de 0.75', () => {
    expect(getMoonPhaseName(0.75)).toBe('Dernier quartier')
  })

  it('revient à « Nouvelle lune » pour une phase proche de 1', () => {
    expect(getMoonPhaseName(0.99)).toBe('Nouvelle lune')
  })

  it('normalise une phase hors bornes (supérieure à 1)', () => {
    expect(getMoonPhaseName(1.5)).toBe('Pleine lune')
  })
})

describe('getMoonPhaseInfo', () => {
  it('retourne un nom, une illumination et une phase pour une date valide', () => {
    const info = getMoonPhaseInfo(new Date('2025-01-01T12:00:00'))
    expect(typeof info.name).toBe('string')
    expect(info.name.length).toBeGreaterThan(0)
    expect(info.illumination).toBeGreaterThanOrEqual(0)
    expect(info.illumination).toBeLessThanOrEqual(100)
  })

  it('retourne des valeurs neutres pour une date invalide', () => {
    expect(getMoonPhaseInfo(new Date('invalid'))).toEqual({
      name: '',
      illumination: 0,
      phase: 0,
    })
  })

  it('retourne des valeurs neutres pour un type incorrect', () => {
    expect(getMoonPhaseInfo(null)).toEqual({ name: '', illumination: 0, phase: 0 })
    expect(getMoonPhaseInfo('2025-01-01')).toEqual({ name: '', illumination: 0, phase: 0 })
  })
})

describe('getDayLength', () => {
  it('calcule correctement une durée de jour standard', () => {
    const times = {
      sunrise: new Date('2025-06-21T06:00:00'),
      sunset: new Date('2025-06-21T20:30:00'),
    }
    const result = getDayLength(times)
    expect(result.minutes).toBe(870)
    expect(result.label).toBe('14h 30min')
  })

  it('formate les minutes sur deux chiffres', () => {
    const times = {
      sunrise: new Date('2025-01-01T08:00:00'),
      sunset: new Date('2025-01-01T16:05:00'),
    }
    expect(getDayLength(times).label).toBe('8h 05min')
  })

  it('retourne une durée nulle si les heures sont invalides (région polaire)', () => {
    const times = { sunrise: new Date('invalid'), sunset: new Date('invalid') }
    expect(getDayLength(times)).toEqual({ minutes: 0, label: '' })
  })

  it('retourne une durée nulle si le coucher précède le lever', () => {
    const times = {
      sunrise: new Date('2025-01-01T20:00:00'),
      sunset: new Date('2025-01-01T06:00:00'),
    }
    expect(getDayLength(times)).toEqual({ minutes: 0, label: '' })
  })

  it('gère un objet times absent sans planter', () => {
    expect(getDayLength(undefined)).toEqual({ minutes: 0, label: '' })
    expect(getDayLength({})).toEqual({ minutes: 0, label: '' })
  })
})

describe('shiftDate', () => {
  it('avance d\'un jour', () => {
    expect(shiftDate('2025-01-01', 1)).toBe('2025-01-02')
  })

  it('recule d\'un jour', () => {
    expect(shiftDate('2025-01-01', -1)).toBe('2024-12-31')
  })

  it('gère le passage de mois', () => {
    expect(shiftDate('2025-01-31', 1)).toBe('2025-02-01')
  })

  it('gère un décalage nul', () => {
    expect(shiftDate('2025-06-15', 0)).toBe('2025-06-15')
  })

  it('retourne la valeur d\'entrée pour une date invalide', () => {
    expect(shiftDate('pas-une-date', 1)).toBe('pas-une-date')
  })
})
