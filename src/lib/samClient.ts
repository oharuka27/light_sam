import { WorkerClient } from './workerRpc'
import type { MaskResult, ModelLoadProgress } from '../types'

export class SamClient {
  private client: WorkerClient
  private progressListeners = new Set<(p: ModelLoadProgress) => void>()

  constructor() {
    const worker = new Worker(new URL('../workers/samWorker.ts', import.meta.url), { type: 'module' })
    this.client = new WorkerClient(worker)
    this.client.onEvent((event, payload) => {
      if (event === 'progress') {
        for (const listener of this.progressListeners) listener(payload as ModelLoadProgress)
      }
    })
  }

  onProgress(listener: (p: ModelLoadProgress) => void) {
    this.progressListeners.add(listener)
    return () => this.progressListeners.delete(listener)
  }

  loadModel() {
    return this.client.call<void>('loadModel')
  }

  setImage(bitmap: ImageBitmap) {
    return this.client.call<{ width: number; height: number }>('setImage', { bitmap }, [bitmap])
  }

  decodePoint(x: number, y: number) {
    return this.client.call<MaskResult>('decodePoint', { x, y })
  }

  terminate() {
    this.client.terminate()
  }
}
