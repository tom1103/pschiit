import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ModalComponent from './ModalComponent.vue'

describe('ModalComponent.vue', () => {
  it('se rend correctement avec le slot par défaut', () => {
    const wrapper = mount(ModalComponent, {
      slots: {
        default: '<div class="slot-content">Contenu de test</div>',
      },
    });
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('.modal-content').exists()).toBe(true);
    expect(wrapper.find('.slot-content').text()).toBe('Contenu de test');
  });

  it('émet un événement "open" lors du montage', () => {
    const wrapper = mount(ModalComponent);
    // Vue Test Utils capture les événements dans wrapper.emitted()
    expect(wrapper.emitted()).toHaveProperty('open');
    expect(wrapper.emitted().open).toHaveLength(1);
  });

  it('émet un événement "close" en cliquant sur le bouton de fermeture', async () => {
    const wrapper = mount(ModalComponent);
    await wrapper.find('.close-button').trigger('click');
    expect(wrapper.emitted()).toHaveProperty('close');
    expect(wrapper.emitted().close).toHaveLength(1);
  });

  it('émet un événement "close" en cliquant sur le fond de la modale', async () => {
    const wrapper = mount(ModalComponent);
    await wrapper.find('.modal-backdrop').trigger('click');
    expect(wrapper.emitted()).toHaveProperty('close');
    expect(wrapper.emitted().close).toHaveLength(1);
  });

  it('n\'émet pas d\'événement "close" en cliquant sur le contenu de la modale', async () => {
    const wrapper = mount(ModalComponent);
    // .stop sur l'événement click devrait empêcher la propagation
    await wrapper.find('.modal-content').trigger('click');
    expect(wrapper.emitted().close).toBeUndefined();
  });
});
