import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import TheSoleil from './TheSoleil.vue'

describe('TheSoleil.vue Security Fix', () => {
  let wrapper

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    if (wrapper) {
      wrapper.unmount()
    }
  })

  it('affiche un message d\'erreur si la géolocalisation n\'est pas supportée lors du switch', async () => {
    // Mock navigator.geolocation as undefined
    const originalGeolocation = global.navigator.geolocation
    Object.defineProperty(global.navigator, 'geolocation', {
      value: undefined,
      configurable: true,
    })

    wrapper = mount(TheSoleil, {
      global: {
        stubs: {
          SunMoonGraph: true,
          CarteLocalisation: true,
        },
      },
    })

    // Act: toggle suivreLocalisation
    await wrapper.find('#suivre').setValue(true)

    // Assert
    expect(wrapper.vm.locationError).toBe("La géolocalisation n'est pas supportée par ce navigateur.")
    expect(wrapper.vm.suivreLocalisation).toBe(false)
    expect(wrapper.text()).toContain("La géolocalisation n'est pas supportée par ce navigateur.")

    // Cleanup
    Object.defineProperty(global.navigator, 'geolocation', {
      value: originalGeolocation,
      configurable: true,
    })
  })

  it('gère les erreurs de watchPosition et affiche le message approprié', async () => {
    let errorCallback
    const mockGeolocation = {
      watchPosition: vi.fn().mockImplementation((success, error) => {
        errorCallback = error
        return 123 // watchId
      }),
      clearWatch: vi.fn(),
    }

    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true,
    })

    wrapper = mount(TheSoleil, {
      global: {
        stubs: {
          SunMoonGraph: true,
          CarteLocalisation: true,
        },
      },
    })

    // Act: start watching
    await wrapper.find('#suivre').setValue(true)
    expect(mockGeolocation.watchPosition).toHaveBeenCalled()

    // Simulate error: PERMISSION_DENIED (1)
    errorCallback({ code: 1, PERMISSION_DENIED: 1 })

    // Assert
    expect(wrapper.vm.locationError).toBe("L'accès à la position a été refusé.")
    expect(wrapper.vm.suivreLocalisation).toBe(false)
    expect(wrapper.text()).toContain("L'accès à la position a été refusé.")
  })
})
