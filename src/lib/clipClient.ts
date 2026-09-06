import { WorkerClient } from './workerRpc'
import type { ModelLoadProgress } from '../types'

export interface RawClassification {
  label: string
  score: number
}

export class ClipClient {
  private client: WorkerClient
  private progressListeners = new Set<(p: ModelLoadProgress) => void>()

  constructor() {
    const worker = new Worker(new URL('../workers/clipWorker.ts', import.meta.url), { type: 'module' })
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

  classify(bitmap: ImageBitmap, candidateLabels: string[]) {
    return this.client.call<RawClassification[]>('classify', { bitmap, candidateLabels }, [bitmap])
  }

  terminate() {
    this.client.terminate()
  }
}
