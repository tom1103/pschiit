import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import SunCalc from 'suncalc'
import MomentsPhoto from './MomentsPhoto.vue'

// Heures solaires d'un jour d'été à Paris : les quatre fenêtres photo existent.
const times = SunCalc.getTimes(new Date('2025-06-21T12:00:00'), 48.8566, 2.3522)

describe('MomentsPhoto.vue', () => {
  it('se rend sans erreur', () => {
    const wrapper = mount(MomentsPhoto, { props: { times } })
    expect(wrapper.exists()).toBe(true)
  })

  it('affiche le titre de la section', () => {
    const wrapper = mount(MomentsPhoto, { props: { times } })
    expect(wrapper.find('h2').text()).toContain('Moments pour la photo')
  })

  it('liste les quatre créneaux photo', () => {
    const wrapper = mount(MomentsPhoto, { props: { times } })
    const items = wrapper.findAll('li')
    expect(items).toHaveLength(4)
    expect(wrapper.text()).toContain('Heure bleue (matin)')
    expect(wrapper.text()).toContain('Heure dorée (soir)')
  })

  it('affiche un message quand aucun créneau n\'est disponible', () => {
    // Région polaire en été : bornes invalides, aucun créneau exploitable.
    const polaire = SunCalc.getTimes(new Date('2025-06-21T12:00:00'), 85, 0)
    const wrapper = mount(MomentsPhoto, { props: { times: polaire } })
    expect(wrapper.findAll('li')).toHaveLength(0)
    expect(wrapper.text()).toContain('Aucun créneau')
  })

  it('affiche les plages horaires formatées', () => {
    const wrapper = mount(MomentsPhoto, { props: { times } })
    // Chaque créneau affiche une plage « HH:MM → HH:MM ».
    expect(wrapper.text()).toMatch(/\d{2}:\d{2} → \d{2}:\d{2}/)
  })
})
