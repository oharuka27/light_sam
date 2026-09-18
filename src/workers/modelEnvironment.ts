import { env } from '@huggingface/transformers'

// モデルは同一オリジンのCloudflare Worker経由で非公開R2から取得する。
// Hugging Faceへのフォールバックを無効にし、意図しない外部通信を防ぐ。
env.localModelPath = '/models/'
env.allowLocalModels = true
env.allowRemoteModels = false
