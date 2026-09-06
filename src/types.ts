export interface Point {
  x: number
  y: number
}

export interface MaskResult {
  /** mask width/height match the ORIGINAL image size */
  width: number
  height: number
  /** 1 byte per pixel, 0 or 255 */
  data: Uint8Array
  score: number
  bbox: { x: number; y: number; width: number; height: number }
}

export interface ClassificationResult {
  id: string
  labelJa: string
  score: number
}

export type PipelineStage =
  | 'idle'
  | 'loading-models'
  | 'encoding-image'
  | 'ready'
  | 'decoding-mask'
  | 'classifying'
  | 'error'

export interface ModelLoadProgress {
  model: 'sam' | 'clip'
  status: string
  progress: number | null
}
