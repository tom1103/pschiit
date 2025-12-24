import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import SunMoonGraph from './SunMoonGraph.vue'
import ModalComponent from './ModalComponent.vue'

// Mock de vue-chartjs pour éviter les erreurs de rendu du canvas
vi.mock('vue-chartjs', () => ({
  Line: {
    props: ['data', 'options'],
    template: '<div class="mocked-chart"></div>'
  }
}))

describe('SunMoonGraph.vue', () => {
  const defaultProps = {
    latitude: 48.8566,
    longitude: 2.3522,
    date: new Date('2024-01-01T12:00:00Z')
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
})
