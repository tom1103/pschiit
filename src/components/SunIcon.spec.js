import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import SunIcon from './SunIcon.vue'

describe('SunIcon.vue', () => {
  it('se rend sans erreur', () => {
    const wrapper = mount(SunIcon, {
      props: { name: 'sunrise' },
    })
    expect(wrapper.exists()).toBe(true)
  });

  it('affiche l\'icône "sunrise" correctement', () => {
    const wrapper = mount(SunIcon, {
      props: { name: 'sunrise' },
    });
    // v-html rend le SVG, nous vérifions donc le contenu HTML du composant
    const html = wrapper.html();
    expect(html).toContain('<svg');
    expect(html).toContain('icon-tabler-sunrise');
  });

  it('affiche l\'icône "sunset" correctement', () => {
    const wrapper = mount(SunIcon, {
      props: { name: 'sunset' },
    });
    const html = wrapper.html();
    expect(html).toContain('<svg');
    expect(html).toContain('icon-tabler-sunset');
  });

  it('affiche l\'icône "day" correctement', () => {
    const wrapper = mount(SunIcon, {
      props: { name: 'day' },
    });
    const html = wrapper.html();
    expect(html).toContain('<svg');
    expect(html).toContain('icon-tabler-sun');
  });

  it('affiche l\'icône "night" correctement', () => {
    const wrapper = mount(SunIcon, {
      props: { name: 'night' },
    });
    const html = wrapper.html();
    expect(html).toContain('<svg');
    expect(html).toContain('icon-tabler-moon');
  });

  it('ne rend rien si le nom de l\'icône est invalide', () => {
    const wrapper = mount(SunIcon, {
      props: { name: 'invalid-icon-name' },
    });
    // La propriété calculée retournera une chaîne vide, donc le v-html ne rendra rien
    const div = wrapper.find('div');
    expect(div.element.innerHTML).toBe('');
  });

  it('applique les classes CSS de base au conteneur', () => {
    const wrapper = mount(SunIcon, {
      props: { name: 'sunrise' },
    });
    expect(wrapper.classes()).toContain('w-6');
    expect(wrapper.classes()).toContain('h-6');
  });
});
