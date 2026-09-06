/// <reference lib="webworker" />
import { SamModel, AutoProcessor, RawImage, type Tensor } from '@huggingface/transformers'
import { createRpcServer, emitEvent } from '../lib/workerRpc'
import { pickDevice } from '../lib/device'

const MODEL_ID = 'Xenova/slimsam-77-uniform'

type ProgressInfo = { status?: string; progress?: number }

interface ImageState {
  originalSizes: { height: number; width: number }[]
  reshapedInputSizes: { height: number; width: number }[]
  embeddings: { image_embeddings: Tensor; image_positional_embeddings: Tensor }
}

// transformers.jsの型は複雑なため、Worker内部の実装詳細としてanyで扱う
// (RPC境界の外に出るデータは呼び出し側で型付けする)
let model: any = null
let processor: any = null
let current: ImageState | null = null

function reportProgress(p: ProgressInfo) {
  emitEvent('progress', {
    model: 'sam',
    status: p.status ?? 'loading',
    progress: typeof p.progress === 'number' ? p.progress : null,
  })
}

async function ensureModel() {
  if (model && processor) return

  const device = await pickDevice()
  reportProgress({ status: `loading model (${device})`, progress: 0 })

  const load = (dtype_device: 'webgpu' | 'wasm') =>
    Promise.all([
      SamModel.from_pretrained(MODEL_ID, {
        dtype: 'q8',
        device: dtype_device,
        progress_callback: reportProgress,
      }),
      AutoProcessor.from_pretrained(MODEL_ID, { progress_callback: reportProgress }),
    ])

  try {
    ;[model, processor] = await load(device)
  } catch (err) {
    if (device === 'webgpu') {
      // WebGPUでの読み込みに失敗した端末向けにWASMで再試行する
      ;[model, processor] = await load('wasm')
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

  async setImage(payload) {
    const { bitmap } = payload as { bitmap: ImageBitmap }
    await ensureModel()

    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('failed to get 2d context')
    ctx.drawImage(bitmap, 0, 0)
    bitmap.close()

    const image = RawImage.fromCanvas(canvas)
    const inputs = await processor(image)
    const embeddings = await model.get_image_embeddings({ pixel_values: inputs.pixel_values })

    current = {
      originalSizes: inputs.original_sizes,
      reshapedInputSizes: inputs.reshaped_input_sizes,
      embeddings,
    }

    return { width: image.width, height: image.height }
  },

  async decodePoint(payload) {
    const { x, y } = payload as { x: number; y: number }
    if (!current || !model || !processor) throw new Error('画像がまだロードされていません')

    const input_points = processor.reshape_input_points(
      [[[x, y]]],
      current.originalSizes,
      current.reshapedInputSizes,
    )

    const { pred_masks, iou_scores } = await model({
      input_points,
      ...current.embeddings,
    })

    const masks = await processor.post_process_masks(pred_masks, current.originalSizes, current.reshapedInputSizes)
    const mask = masks[0] as Tensor // dims: [point_batch_size(1), num_masks(3), H, W]

    const scores = Array.from(iou_scores.data as Float32Array)
    let bestChannel = 0
    for (let i = 1; i < scores.length; i++) {
      if (scores[i] > scores[bestChannel]) bestChannel = i
    }

    const [, , height, width] = mask.dims
    const channelSize = height * width
    const offset = bestChannel * channelSize
    const src = mask.data as Uint8Array

    const maskData = new Uint8Array(channelSize)
    let minX = width
    let minY = height
    let maxX = -1
    let maxY = -1
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const on = src[offset + py * width + px] !== 0
        maskData[py * width + px] = on ? 255 : 0
        if (on) {
          if (px < minX) minX = px
          if (px > maxX) maxX = px
          if (py < minY) minY = py
          if (py > maxY) maxY = py
        }
      }
    }

    const bbox =
      maxX >= minX && maxY >= minY
        ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
        : { x: 0, y: 0, width: 0, height: 0 }

    return { width, height, data: maskData, score: scores[bestChannel], bbox }
  },
})
