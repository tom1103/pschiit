import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Visualisation3D from './Visualisation3D.vue'

// jsdom peut fournir un contexte WebGL factice non fiable. Pour tester le composant de façon
// déterministe (et sans charger Three.js, impossible à rendre en jsdom), on force l'absence de
// WebGL en faisant renvoyer null à getContext : le composant doit alors afficher son repli.
describe('Visualisation3D.vue (WebGL indisponible)', () => {
  let getContextSpy
  let originalWebGL

  beforeEach(() => {
    // On neutralise les deux conditions de détection WebGL lues par le composant :
    // window.WebGLRenderingContext et le contexte renvoyé par getContext.
    originalWebGL = window.WebGLRenderingContext
    window.WebGLRenderingContext = undefined
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(null)
  })

  afterEach(() => {
    getContextSpy.mockRestore()
    window.WebGLRenderingContext = originalWebGL
  })

  const props = { latitude: 48.8566, longitude: 2.3522 }

  it('se rend sans erreur', () => {
    const wrapper = mount(Visualisation3D, { props })
    expect(wrapper.exists()).toBe(true)
  })

  it('affiche le titre de la section', () => {
    const wrapper = mount(Visualisation3D, { props })
    expect(wrapper.find('h2').text()).toContain('Terre, Lune et Soleil')
  })

  it('affiche le message de repli quand WebGL n\'est pas supporté', async () => {
    const wrapper = mount(Visualisation3D, { props })
    // onMounted met à jour isWebglSupported : on attend le rafraîchissement du DOM.
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Visualisation 3D indisponible')
    expect(wrapper.find('.globe-container').exists()).toBe(false)
  })

  it('accepte la mise à jour des props de position sans erreur', async () => {
    const wrapper = mount(Visualisation3D, { props })
    await wrapper.setProps({ latitude: 40.7128, longitude: -74.006 })
    expect(wrapper.exists()).toBe(true)
  })
})
