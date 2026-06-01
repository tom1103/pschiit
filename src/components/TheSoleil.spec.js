import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import TheSoleil from './TheSoleil.vue'

// Mock de l'API de géolocalisation
const mockGeolocation = {
  getCurrentPosition: vi.fn().mockImplementation((success) =>
    success({
      coords: {
        latitude: 51.5074,
        longitude: -0.1278,
      },
    }),
  ),
}
Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  configurable: true,
})

describe('TheSoleil.vue', () => {
  let wrapper

  beforeEach(() => {
    vi.clearAllMocks()
    wrapper = mount(TheSoleil, {
      global: {
        stubs: {
          SunMoonGraph: true, // Empêche le rendu du composant enfant
          CarteLocalisation: true, // Empêche le rendu du composant enfant
          MomentsPhoto: true, // Empêche le rendu du composant enfant
          Visualisation3D: true, // Empêche le rendu du composant enfant
        },
      },
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

  it('affiche la durée du jour et la phase de la lune', () => {
    // Les libellés calculés doivent être présents dans le rendu.
    expect(wrapper.text()).toContain('Durée du jour')
    expect(wrapper.vm.dayLength.label).toMatch(/\d+h \d{2}min/)
    expect(wrapper.vm.moonPhase.name.length).toBeGreaterThan(0)
  })

  it('avance et recule la date via la navigation par jour', () => {
    wrapper.vm.date = '2025-06-15'
    wrapper.vm.changeDay(1)
    expect(wrapper.vm.date).toBe('2025-06-16')
    wrapper.vm.changeDay(-1)
    expect(wrapper.vm.date).toBe('2025-06-15')
  })

  it("réinitialise la date sur aujourd'hui", () => {
    wrapper.vm.date = '2000-01-01'
    wrapper.vm.goToToday()
    expect(wrapper.vm.date).toBe(new Date().toISOString().slice(0, 10))
  })
})
