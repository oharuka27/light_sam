import { afterEach, describe, expect, it, vi } from 'vitest'
import { pickDevice } from './device'

function setNavigatorGpu(value: unknown) {
  Object.defineProperty(navigator, 'gpu', { value, configurable: true })
}

describe('pickDevice', () => {
  afterEach(() => {
    setNavigatorGpu(undefined)
  })

  it('WebGPU非対応環境では"wasm"を返す', async () => {
    setNavigatorGpu(undefined)
    await expect(pickDevice()).resolves.toBe('wasm')
  })

  it('requestAdapterがアダプタを返せば"webgpu"を返す', async () => {
    setNavigatorGpu({ requestAdapter: vi.fn().mockResolvedValue({}) })
    await expect(pickDevice()).resolves.toBe('webgpu')
  })

  it('requestAdapterがnullを返す場合は"wasm"にフォールバックする', async () => {
    setNavigatorGpu({ requestAdapter: vi.fn().mockResolvedValue(null) })
    await expect(pickDevice()).resolves.toBe('wasm')
  })

  it('requestAdapterが例外を投げても"wasm"にフォールバックする(黙って落ちない)', async () => {
    setNavigatorGpu({ requestAdapter: vi.fn().mockRejectedValue(new Error('boom')) })
    await expect(pickDevice()).resolves.toBe('wasm')
  })
})
