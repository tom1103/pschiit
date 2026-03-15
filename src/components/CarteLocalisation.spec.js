import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CarteLocalisation from './CarteLocalisation.vue'
import { nextTick } from 'vue'

// Mock mapboxConfig module
vi.mock('@/services/mapboxConfig', () => ({
  getMapboxAccessToken: vi.fn(),
  hasMapboxAccessToken: vi.fn(),
}))

// Mock mapbox-gl module
const mockRemove = vi.fn()
const mockFlyTo = vi.fn()
const mockSetStyle = vi.fn()
const mockSetLngLat = vi.fn().mockReturnThis()
const mockAddTo = vi.fn().mockReturnThis()
const mockGetElement = vi.fn(() => {
  const div = document.createElement('div')
  div.classList.add('mapboxgl-marker')
  return div
})

vi.mock('mapbox-gl', () => {
  return {
    default: {
      accessToken: '',
      Map: vi.fn(function () {
        this.remove = mockRemove
        this.flyTo = mockFlyTo
        this.setStyle = mockSetStyle
      }),
      Marker: vi.fn(function () {
        this.setLngLat = mockSetLngLat
        this.addTo = mockAddTo
        this.getElement = mockGetElement
      }),
    },
  }
})

import { hasMapboxAccessToken, getMapboxAccessToken } from '@/services/mapboxConfig'
import mapboxgl from 'mapbox-gl'

describe('CarteLocalisation.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hasMapboxAccessToken.mockReturnValue(true)
    getMapboxAccessToken.mockReturnValue('valid-token')
  })

  it('renders the error container when mapbox token is missing', () => {
    hasMapboxAccessToken.mockReturnValue(false)
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const wrapper = mount(CarteLocalisation, {
      props: {
        longitude: 2.3522,
        latitude: 48.8566,
      },
    })

    expect(wrapper.find('.map-error-container').exists()).toBe(true)
    expect(wrapper.find('.map-container').exists()).toBe(false)
    expect(consoleSpy).toHaveBeenCalledWith('Mapbox access token is missing.')
    consoleSpy.mockRestore()
  })

  it('renders the map container when mapbox token is valid', () => {
    const wrapper = mount(CarteLocalisation, {
      props: {
        longitude: 2.3522,
        latitude: 48.8566,
        zoom: 12,
        mapStyle: 'mapbox://styles/test/style'
      },
    })

    expect(wrapper.find('.map-container').exists()).toBe(true)
    expect(wrapper.find('.map-error-container').exists()).toBe(false)

    // Check Mapbox initialization
    expect(mapboxgl.accessToken).toBe('valid-token')
    expect(mapboxgl.Map).toHaveBeenCalledWith({
      container: wrapper.find('.map-container').element,
      style: 'mapbox://styles/test/style',
      center: [2.3522, 48.8566],
      zoom: 12,
    })

    // Check Marker initialization
    expect(mapboxgl.Marker).toHaveBeenCalled()
    expect(mockSetLngLat).toHaveBeenCalledWith([2.3522, 48.8566])
    expect(mockAddTo).toHaveBeenCalled()
  })

  it('adds and removes the "blinking" class based on suivreLocalisation prop', async () => {
    const markerElement = document.createElement('div')
    mockGetElement.mockReturnValue(markerElement)

    const wrapper = mount(CarteLocalisation, {
      props: {
        longitude: 2.3522,
        latitude: 48.8566,
        suivreLocalisation: false,
      },
    })

    expect(markerElement.classList.contains('blinking')).toBe(false)

    await wrapper.setProps({ suivreLocalisation: true })
    expect(markerElement.classList.contains('blinking')).toBe(true)

    await wrapper.setProps({ suivreLocalisation: false })
    expect(markerElement.classList.contains('blinking')).toBe(false)
  })

  it('updates map and marker when longitude or latitude props change', async () => {
    const wrapper = mount(CarteLocalisation, {
      props: {
        longitude: 2.3522,
        latitude: 48.8566,
      },
    })

    // Reset mocks after initialization
    mockFlyTo.mockClear()
    mockSetLngLat.mockClear()

    await wrapper.setProps({ longitude: 4.8357, latitude: 45.7640 })

    expect(mockFlyTo).toHaveBeenCalledWith({
      center: [4.8357, 45.7640],
      essential: true,
    })
    expect(mockSetLngLat).toHaveBeenCalledWith([4.8357, 45.7640])
  })

  it('updates map zoom when zoom prop changes', async () => {
    const wrapper = mount(CarteLocalisation, {
      props: {
        longitude: 2.3522,
        latitude: 48.8566,
        zoom: 9,
      },
    })

    mockFlyTo.mockClear()

    await wrapper.setProps({ zoom: 14 })

    expect(mockFlyTo).toHaveBeenCalledWith({
      zoom: 14,
      essential: true,
    })
  })

  it('updates map style when mapStyle prop changes', async () => {
    const wrapper = mount(CarteLocalisation, {
      props: {
        longitude: 2.3522,
        latitude: 48.8566,
        mapStyle: 'mapbox://styles/test/style1',
      },
    })

    mockSetStyle.mockClear()

    await wrapper.setProps({ mapStyle: 'mapbox://styles/test/style2' })

    expect(mockSetStyle).toHaveBeenCalledWith('mapbox://styles/test/style2')
  })

  it('calls map.remove() on component unmount', () => {
    const wrapper = mount(CarteLocalisation, {
      props: {
        longitude: 2.3522,
        latitude: 48.8566,
      },
    })

    wrapper.unmount()
    expect(mockRemove).toHaveBeenCalled()
  })
})
