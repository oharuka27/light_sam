export type InferenceDevice = 'webgpu' | 'wasm'

// WebGPUはSafari/一部Androidでまだ挙動が不安定なため、requestAdapterまで
// 実際に試して確認する。失敗したら黙ってWASMにフォールバックする。
export async function pickDevice(): Promise<InferenceDevice> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu
  if (!gpu) return 'wasm'
  try {
    const adapter = await gpu.requestAdapter()
    return adapter ? 'webgpu' : 'wasm'
  } catch {
    return 'wasm'
  }
}
