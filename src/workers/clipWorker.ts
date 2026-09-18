/// <reference lib="webworker" />
import { pipeline } from '@huggingface/transformers'
import { createRpcServer, emitEvent } from '../lib/workerRpc'
import { pickDevice } from '../lib/device'
import './modelEnvironment'

const MODEL_ID = 'Xenova/clip-vit-base-patch32'
const HYPOTHESIS_TEMPLATE = 'This is a photo of {}'

type ProgressInfo = { status?: string; progress?: number }

// transformers.jsのpipeline型は複雑なため、Worker内部の実装詳細としてanyで扱う
let classifier: any = null

function reportProgress(p: ProgressInfo) {
  emitEvent('progress', {
    model: 'clip',
    status: p.status ?? 'loading',
    progress: typeof p.progress === 'number' ? p.progress : null,
  })
}

async function ensureModel() {
  if (classifier) return

  const device = await pickDevice()
  reportProgress({ status: `loading model (${device})`, progress: 0 })

  const load = (dtype_device: 'webgpu' | 'wasm') =>
    pipeline('zero-shot-image-classification', MODEL_ID, {
      dtype: 'q8',
      device: dtype_device,
      progress_callback: reportProgress,
    })

  try {
    classifier = await load(device)
  } catch (err) {
    if (device === 'webgpu') {
      classifier = await load('wasm')
    } else {
      throw err
    }
  }

  reportProgress({ status: 'ready', progress: 1 })
}

createRpcServer({
  async loadModel() {
    await ensureModel()
    return {}
  },

  async classify(payload) {
    const { bitmap, candidateLabels } = payload as { bitmap: ImageBitmap; candidateLabels: string[] }
    await ensureModel()

    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('failed to get 2d context')
    ctx.drawImage(bitmap, 0, 0)
    bitmap.close()

    const results = await classifier(canvas, candidateLabels, {
      hypothesis_template: HYPOTHESIS_TEMPLATE,
    })

    return results as { label: string; score: number }[]
  },
})
