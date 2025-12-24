import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import TheSoleil from './TheSoleil.vue'

// Mock de l'API de géolocalisation
const mockGeolocation = {
  getCurrentPosition: vi.fn().mockImplementation((success) =>
    success({
      coords: {
        latitude: 51.5074,
        longitude: -0.1278
      }
    })
  )
}
Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  configurable: true
})

describe('TheSoleil.vue', () => {
  let wrapper

  beforeEach(() => {
    vi.clearAllMocks()
    wrapper = mount(TheSoleil, {
      global: {
        stubs: {
          SunMoonGraph: true, // Empêche le rendu du composant enfant
          CarteLocalisation: true // Empêche le rendu du composant enfant
        }
      }
    })
  })

  it('se rend sans erreur', () => {
    expect(wrapper.exists()).toBe(true)
  })

  it('affiche le titre correctement', () => {
    expect(wrapper.find('h1').text()).toBe('Éphémérides du Soleil')
  })

  it("bascule l'affichage des contrôles manuels", async () => {
    expect(wrapper.find('#latitude').exists()).toBe(false)
    await wrapper.find('button.p-2').trigger('click')
    expect(wrapper.vm.showManualControls).toBe(true)
    expect(wrapper.find('#latitude').exists()).toBe(true)
  })

  it('met à jour la géolocalisation au clic', async () => {
    await wrapper.find('button.bg-blue-500').trigger('click')
    expect(wrapper.vm.latitude).toBe(51.5074)
  })
})
