import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRpcServer, emitEvent, WorkerClient, type RpcRequest } from './workerRpc'

type MessageListener = (e: { data: unknown }) => void

// postMessage/addEventListener/terminateだけを持つ最小限のWorkerスタブ。
// 実際のWorkerを起動せずにWorkerClientのRPCロジックだけを検証する。
class FakeWorker {
  posted: RpcRequest[] = []
  terminated = false
  private listeners: MessageListener[] = []

  addEventListener(type: string, cb: MessageListener) {
    if (type === 'message') this.listeners.push(cb)
  }

  postMessage(msg: RpcRequest) {
    this.posted.push(msg)
  }

  terminate() {
    this.terminated = true
  }

  // テストからWorker側の応答をシミュレートする
  respond(data: unknown) {
    for (const cb of this.listeners) cb({ data })
  }
}

describe('WorkerClient', () => {
  it('okな応答が返るとcall()がpayloadでresolveする', async () => {
    const fake = new FakeWorker()
    const client = new WorkerClient(fake as unknown as Worker)

    const promise = client.call<{ answer: number }>('ping', { x: 1 })

    expect(fake.posted).toHaveLength(1)
    expect(fake.posted[0].type).toBe('ping')
    expect(fake.posted[0].payload).toEqual({ x: 1 })

    fake.respond({ id: fake.posted[0].id, ok: true, payload: { answer: 42 } })

    await expect(promise).resolves.toEqual({ answer: 42 })
  })

  it('okがfalseの応答が返るとcall()がerrorでreject する', async () => {
    const fake = new FakeWorker()
    const client = new WorkerClient(fake as unknown as Worker)

    const promise = client.call('boom')
    fake.respond({ id: fake.posted[0].id, ok: false, error: 'それは無理です' })

    await expect(promise).rejects.toThrow('それは無理です')
  })

  it('関係ないidの応答は無視され、対応するcall()だけがresolveする', async () => {
    const fake = new FakeWorker()
    const client = new WorkerClient(fake as unknown as Worker)

    const promise = client.call<string>('task')
    const realId = fake.posted[0].id

    fake.respond({ id: realId + 999, ok: true, payload: 'wrong call' })
    fake.respond({ id: realId, ok: true, payload: 'correct call' })

    await expect(promise).resolves.toBe('correct call')
  })

  it('event付きメッセージはonEventリスナーに配送され、保留中のcall()は解決しない', async () => {
    const fake = new FakeWorker()
    const client = new WorkerClient(fake as unknown as Worker)

    const received: Array<[string, unknown]> = []
    client.onEvent((event, payload) => received.push([event, payload]))

    fake.respond({ id: 0, ok: true, event: 'progress', payload: { pct: 50 } })

    expect(received).toEqual([['progress', { pct: 50 }]])
  })

  it('terminate()は内部のWorker.terminate()を呼ぶ', () => {
    const fake = new FakeWorker()
    const client = new WorkerClient(fake as unknown as Worker)
    client.terminate()
    expect(fake.terminated).toBe(true)
  })
})

describe('createRpcServer / emitEvent (Worker側)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubSelf() {
    const listeners: MessageListener[] = []
    const posted: unknown[] = []
    vi.stubGlobal('self', {
      addEventListener: (type: string, cb: MessageListener) => {
        if (type === 'message') listeners.push(cb)
      },
      postMessage: (msg: unknown) => posted.push(msg),
    })
    return { listeners, posted }
  }

  it('typeに対応するハンドラを呼び出し、okな応答をpostする', async () => {
    const { listeners, posted } = stubSelf()
    createRpcServer({
      double: async (payload) => (payload as { n: number }).n * 2,
    })

    await listeners[0]({ data: { id: 7, type: 'double', payload: { n: 21 } } })

    expect(posted).toEqual([{ id: 7, ok: true, payload: 42 }])
  })

  it('未知のtypeにはエラー応答をpostする', async () => {
    const { listeners, posted } = stubSelf()
    createRpcServer({})

    await listeners[0]({ data: { id: 1, type: 'nope', payload: undefined } })

    expect(posted).toEqual([{ id: 1, ok: false, error: 'unknown request type: nope' }])
  })

  it('ハンドラが例外を投げた場合もエラー応答をpostする(Workerが落ちない)', async () => {
    const { listeners, posted } = stubSelf()
    createRpcServer({
      fail: async () => {
        throw new Error('handler exploded')
      },
    })

    await listeners[0]({ data: { id: 3, type: 'fail', payload: undefined } })

    expect(posted).toEqual([{ id: 3, ok: false, error: 'handler exploded' }])
  })

  it('emitEventはevent形式のメッセージをpostする', () => {
    const posted: unknown[] = []
    vi.stubGlobal('self', { postMessage: (msg: unknown) => posted.push(msg), addEventListener: () => {} })

    emitEvent('progress', { pct: 50 })

    expect(posted).toEqual([{ id: 0, ok: true, event: 'progress', payload: { pct: 50 } }])
  })
})
