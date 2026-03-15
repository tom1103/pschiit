import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import SunMoonGraph from './SunMoonGraph.vue'
import ModalComponent from './ModalComponent.vue'

// Mock de vue-chartjs pour éviter les erreurs de rendu du canvas
vi.mock('vue-chartjs', () => ({
  Line: {
    props: ['data', 'options'],
    template: '<div class="mocked-chart"></div>',
  },
}))

describe('SunMoonGraph.vue', () => {
  const defaultProps = {
    latitude: 48.8566,
    longitude: 2.3522,
    date: new Date('2024-01-01T12:00:00Z'),
  }

  it('se rend sans erreur', () => {
    const wrapper = mount(SunMoonGraph, { props: defaultProps })
    expect(wrapper.exists()).toBe(true)
  })

  it('affiche la modale en cliquant sur le graphique et la ferme', async () => {
    const wrapper = mount(SunMoonGraph, { props: defaultProps, attachTo: document.body })

    // Ouvre la modale
    await wrapper.find('.graph-container').trigger('click')
    expect(wrapper.vm.showModal).toBe(true)
    const modal = wrapper.findComponent(ModalComponent)
    expect(modal.exists()).toBe(true)

    // Ferme la modale
    await modal.vm.$emit('close')
    expect(wrapper.vm.showModal).toBe(false)

    wrapper.unmount()
  })

  describe('timeToLabelIndex', () => {
    it('retourne -1 si l\'heure est null ou non définie', () => {
      const wrapper = mount(SunMoonGraph, { props: defaultProps })
      expect(wrapper.vm.timeToLabelIndex(null)).toBe(-1)
      expect(wrapper.vm.timeToLabelIndex(undefined)).toBe(-1)
    })

    it('retourne 0 pour le début de la journée (00:00:00)', () => {
      const wrapper = mount(SunMoonGraph, { props: defaultProps })
      const startOfDay = new Date(defaultProps.date)
      startOfDay.setHours(0, 0, 0, 0)
      expect(wrapper.vm.timeToLabelIndex(startOfDay)).toBe(0)
    })

    it('retourne l\'index du milieu (72) pour le milieu de la journée (12:00:00)', () => {
      const wrapper = mount(SunMoonGraph, { props: defaultProps })
      const middleOfDay = new Date(defaultProps.date)
      middleOfDay.setHours(12, 0, 0, 0)
      expect(wrapper.vm.timeToLabelIndex(middleOfDay)).toBe(72)
    })

    it('retourne -1 pour une date invalide', () => {
      const wrapper = mount(SunMoonGraph, { props: defaultProps })
      expect(wrapper.vm.timeToLabelIndex(new Date('invalid'))).toBe(-1)
    })

    it('retourne -1 pour une heure qui n\'est pas sur le même jour', () => {
      const wrapper = mount(SunMoonGraph, { props: defaultProps })
      const nextDay = new Date(defaultProps.date)
      nextDay.setDate(nextDay.getDate() + 1)
      nextDay.setHours(12, 0, 0, 0)
      expect(wrapper.vm.timeToLabelIndex(nextDay)).toBe(-1)
    })
  })
})
