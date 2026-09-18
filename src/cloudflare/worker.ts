interface R2ObjectBodyLike {
  body: ReadableStream<Uint8Array>
  size: number
  httpEtag: string
  range?: { offset: number; length: number }
  writeHttpMetadata(headers: Headers): void
}

interface R2BucketLike {
  get(key: string, options?: { range?: Headers }): Promise<R2ObjectBodyLike | null>
}

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> }
  MODELS: R2BucketLike
}

const MODEL_PREFIX = '/models/'

function modelKey(pathname: string): string | null {
  if (!pathname.startsWith(MODEL_PREFIX)) return null

  const encodedKey = pathname.slice(MODEL_PREFIX.length)
  if (!encodedKey) return null

  try {
    const key = decodeURIComponent(encodedKey)
    if (key.split('/').some((part) => part === '..')) return null
    return key
  } catch {
    return null
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const key = modelKey(url.pathname)

    if (key === null) {
      return env.ASSETS.fetch(request)
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { Allow: 'GET, HEAD' },
      })
    }

    const object = await env.MODELS.get(key, { range: request.headers })
    if (object === null) {
      return new Response('Model file not found', { status: 404 })
    }

    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('ETag', object.httpEtag)
    headers.set('Accept-Ranges', 'bytes')
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')

    let status = 200
    if (object.range) {
      status = 206
      const end = object.range.offset + object.range.length - 1
      headers.set('Content-Range', `bytes ${object.range.offset}-${end}/${object.size}`)
      headers.set('Content-Length', String(object.range.length))
    } else {
      headers.set('Content-Length', String(object.size))
    }

    return new Response(request.method === 'HEAD' ? null : object.body, { status, headers })
  },
}
