// 汎用のPromiseベースWorker RPC。id付きメッセージで要求/応答を対応させる。
export interface RpcRequest<TType extends string = string, TPayload = unknown> {
  id: number
  type: TType
  payload: TPayload
}

export interface RpcResponse<TPayload = unknown> {
  id: number
  ok: boolean
  payload?: TPayload
  error?: string
  // 進捗など、要求に紐づかないイベント通知
  event?: string
}

export class WorkerClient {
  private worker: Worker
  private nextId = 1
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
  private eventListeners = new Set<(event: string, payload: unknown) => void>()

  constructor(worker: Worker) {
    this.worker = worker
    this.worker.addEventListener('message', this.handleMessage)
  }

  private handleMessage = (e: MessageEvent<RpcResponse>) => {
    const msg = e.data
    if (msg.event) {
      for (const listener of this.eventListeners) listener(msg.event, msg.payload)
      return
    }
    const pending = this.pending.get(msg.id)
    if (!pending) return
    this.pending.delete(msg.id)
    if (msg.ok) pending.resolve(msg.payload)
    else pending.reject(new Error(msg.error ?? 'worker error'))
  }

  onEvent(listener: (event: string, payload: unknown) => void) {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  call<TResult, TPayload = unknown>(type: string, payload?: TPayload, transfer?: Transferable[]): Promise<TResult> {
    const id = this.nextId++
    return new Promise<TResult>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject })
      const request: RpcRequest = { id, type, payload }
      this.worker.postMessage(request, transfer ?? [])
    })
  }

  terminate() {
    this.worker.terminate()
    this.pending.clear()
  }
}

// Worker側で使うヘルパー。ハンドラを登録してRPCサーバーとして振る舞う。
export function createRpcServer(handlers: Record<string, (payload: unknown) => Promise<unknown>>) {
  self.addEventListener('message', async (e: MessageEvent<RpcRequest>) => {
    const { id, type, payload } = e.data
    const handler = handlers[type]
    if (!handler) {
      const response: RpcResponse = { id, ok: false, error: `unknown request type: ${type}` }
      self.postMessage(response)
      return
    }
    try {
      const result = await handler(payload)
      const response: RpcResponse = { id, ok: true, payload: result }
      self.postMessage(response)
    } catch (err) {
      const response: RpcResponse = { id, ok: false, error: err instanceof Error ? err.message : String(err) }
      self.postMessage(response)
    }
  })
}

export function emitEvent(event: string, payload?: unknown) {
  const response: RpcResponse = { id: 0, ok: true, event, payload }
  self.postMessage(response)
}
