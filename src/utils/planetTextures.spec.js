import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  CDN_TEXTURES,
  createEarthTextures,
  createMoonTextures,
  createSunTextures,
} from './planetTextures'

describe('planetTextures', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('CDN_TEXTURES', () => {
    it('expose des URLs HTTPS pour la Terre, son relief et la Lune', () => {
      expect(CDN_TEXTURES.earthMap).toMatch(/^https:\/\//)
      expect(CDN_TEXTURES.earthNormal).toMatch(/^https:\/\//)
      expect(CDN_TEXTURES.moonMap).toMatch(/^https:\/\//)
    })
  })

  // En jsdom, getContext('2d') renvoie null (pas de canvas réel) : les générateurs doivent
  // alors renvoyer null sans planter, ce qui permet au composant de retomber sur une couleur unie.
  describe('génération procédurale sans contexte 2D', () => {
    it('createEarthTextures renvoie null quand le contexte 2D est indisponible', () => {
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
      expect(createEarthTextures()).toBeNull()
    })

    it('createMoonTextures renvoie null quand le contexte 2D est indisponible', () => {
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
      expect(createMoonTextures()).toBeNull()
    })

    it('createSunTextures renvoie null quand le contexte 2D est indisponible', () => {
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
      expect(createSunTextures()).toBeNull()
    })
  })

  // Avec un contexte 2D simulé, les générateurs doivent produire les canvas attendus.
  describe('génération procédurale avec contexte 2D simulé', () => {
    function stubCanvas2D() {
      const ctx = {
        createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
        putImageData: vi.fn(),
        createRadialGradient: () => ({ addColorStop: vi.fn() }),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        set fillStyle(_) {},
      }
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx)
    }

    it('createEarthTextures fournit une couleur et un relief', () => {
      stubCanvas2D()
      const result = createEarthTextures(8, 4)
      expect(result.map).toBeInstanceOf(HTMLCanvasElement)
      expect(result.bump).toBeInstanceOf(HTMLCanvasElement)
    })

    it('createMoonTextures fournit une couleur et un relief', () => {
      stubCanvas2D()
      const result = createMoonTextures(8, 4)
      expect(result.map).toBeInstanceOf(HTMLCanvasElement)
      expect(result.bump).toBeInstanceOf(HTMLCanvasElement)
    })

    it('createSunTextures fournit une couleur (sans relief)', () => {
      stubCanvas2D()
      const result = createSunTextures(8, 4)
      expect(result.map).toBeInstanceOf(HTMLCanvasElement)
      expect(result.bump).toBeNull()
    })
  })
})
