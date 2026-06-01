import { describe, it, expect } from 'vitest'
import SunCalc from 'suncalc'
import {
  getMoonPhaseName,
  getMoonPhaseInfo,
  getDayLength,
  shiftDate,
  getSubsolarPoint,
  getPhotographyMoments,
} from './sunUtils'

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

describe('getSubsolarPoint', () => {
  it('place le point subsolaire près du tropique du Cancer au solstice de juin', () => {
    const { lat } = getSubsolarPoint(new Date('2025-06-21T12:00:00Z'))
    // La déclinaison solaire culmine à environ +23.4° au solstice d'été.
    expect(lat).toBeGreaterThan(23)
    expect(lat).toBeLessThan(23.6)
  })

  it('place le point subsolaire près du tropique du Capricorne au solstice de décembre', () => {
    const { lat } = getSubsolarPoint(new Date('2025-12-21T12:00:00Z'))
    expect(lat).toBeLessThan(-23)
    expect(lat).toBeGreaterThan(-23.6)
  })

  it('renvoie une latitude proche de zéro aux équinoxes', () => {
    const { lat } = getSubsolarPoint(new Date('2025-03-20T12:00:00Z'))
    expect(Math.abs(lat)).toBeLessThan(1)
  })

  it('fait dériver la longitude subsolaire d\'environ -15° par heure', () => {
    const t0 = getSubsolarPoint(new Date('2025-06-21T12:00:00Z')).lon
    const t1 = getSubsolarPoint(new Date('2025-06-21T13:00:00Z')).lon
    // On gère le passage de -180/180 en comparant le plus petit écart angulaire.
    let delta = t1 - t0
    delta = ((((delta + 180) % 360) + 360) % 360) - 180
    expect(delta).toBeGreaterThan(-15.5)
    expect(delta).toBeLessThan(-14.5)
  })

  it('garde la longitude dans l\'intervalle ]-180, 180]', () => {
    const { lon } = getSubsolarPoint(new Date('2025-08-15T03:27:00Z'))
    expect(lon).toBeGreaterThan(-180)
    expect(lon).toBeLessThanOrEqual(180)
  })

  it('renvoie des coordonnées neutres pour une date invalide', () => {
    expect(getSubsolarPoint(new Date('invalid'))).toEqual({ lat: 0, lon: 0 })
    expect(getSubsolarPoint(null)).toEqual({ lat: 0, lon: 0 })
  })
})

describe('getPhotographyMoments', () => {
  // Paris, un jour d'été : toutes les fenêtres existent.
  const times = SunCalc.getTimes(new Date('2025-06-21T12:00:00'), 48.8566, 2.3522)

  it('retourne les quatre créneaux (deux bleus, deux dorés)', () => {
    const moments = getPhotographyMoments(times, times.solarNoon)
    expect(moments).toHaveLength(4)
    expect(moments.filter((m) => m.type === 'blue')).toHaveLength(2)
    expect(moments.filter((m) => m.type === 'golden')).toHaveLength(2)
  })

  it('fournit des libellés horaires formatés', () => {
    const moments = getPhotographyMoments(times, times.solarNoon)
    moments.forEach((m) => {
      expect(m.fromLabel).toMatch(/^\d{2}:\d{2}$/)
      expect(m.toLabel).toMatch(/^\d{2}:\d{2}$/)
    })
  })

  it('marque comme « past » un créneau du matin vu en milieu de journée', () => {
    const moments = getPhotographyMoments(times, times.solarNoon)
    const heureDoreeMatin = moments.find((m) => m.name === 'Heure dorée (matin)')
    expect(heureDoreeMatin.status).toBe('past')
  })

  it('marque comme « upcoming » un créneau du soir vu en milieu de journée', () => {
    const moments = getPhotographyMoments(times, times.solarNoon)
    const heureDoreeSoir = moments.find((m) => m.name === 'Heure dorée (soir)')
    expect(heureDoreeSoir.status).toBe('upcoming')
  })

  it('marque comme « active » un créneau contenant l\'instant de référence', () => {
    // On se place au milieu de l'heure dorée du matin.
    const milieu = new Date((times.sunrise.getTime() + times.goldenHourEnd.getTime()) / 2)
    const moments = getPhotographyMoments(times, milieu)
    const actif = moments.find((m) => m.status === 'active')
    expect(actif).toBeDefined()
    expect(actif.name).toBe('Heure dorée (matin)')
  })

  it('ignore les créneaux aux bornes invalides (région polaire)', () => {
    const polaire = SunCalc.getTimes(new Date('2025-06-21T12:00:00'), 78, 15)
    const moments = getPhotographyMoments(polaire, new Date('2025-06-21T12:00:00'))
    // En été arctique le soleil ne se couche pas : certaines bornes sont invalides.
    expect(moments.length).toBeLessThan(4)
  })

  it('retourne un tableau vide pour une entrée invalide', () => {
    expect(getPhotographyMoments(null)).toEqual([])
    expect(getPhotographyMoments(undefined)).toEqual([])
  })
})
