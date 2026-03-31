import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useGeolocation } from './useGeolocation'
import { nextTick } from 'vue'

// Mock de l'API de géolocalisation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
}

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  configurable: true,
})

describe('useGeolocation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initialise avec des valeurs par défaut', () => {
    const { latitude, longitude, suivreLocalisation, locationError } = useGeolocation()
    expect(latitude.value).toBe(48.8566)
    expect(longitude.value).toBe(2.3522)
    expect(suivreLocalisation.value).toBe(false)
    expect(locationError.value).toBe('')
  })

  it('met à jour les coordonnées avec geoLoc', async () => {
    const { latitude, longitude, geoLoc } = useGeolocation()

    mockGeolocation.getCurrentPosition.mockImplementationOnce((success) =>
      success({
        coords: {
          latitude: 51.5074,
          longitude: -0.1278,
        },
      })
    )

    geoLoc()

    expect(latitude.value).toBe(51.5074)
    expect(longitude.value).toBe(-0.1278)
  })

  it('gère les erreurs de geoLoc', async () => {
    const { locationError, geoLoc } = useGeolocation()

    mockGeolocation.getCurrentPosition.mockImplementationOnce((success, error) =>
      error({
        code: 1, // PERMISSION_DENIED
        PERMISSION_DENIED: 1,
      })
    )

    geoLoc()

    expect(locationError.value).toBe("L'accès à la position a été refusé.")
  })

  it('active le suivi de localisation', async () => {
    const { suivreLocalisation } = useGeolocation()

    mockGeolocation.watchPosition.mockReturnValue(123)

    suivreLocalisation.value = true
    await nextTick()

    expect(mockGeolocation.watchPosition).toHaveBeenCalled()
  })

  it('désactive le suivi de localisation', async () => {
    const { suivreLocalisation } = useGeolocation()

    mockGeolocation.watchPosition.mockReturnValue(123)

    suivreLocalisation.value = true
    await nextTick()

    suivreLocalisation.value = false
    await nextTick()

    expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(123)
  })
})
