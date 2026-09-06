import { useEffect, useRef, type MouseEvent } from 'react'
import type { MaskResult, Point } from '../types'

interface Props {
  bitmap: ImageBitmap | null
  mask: MaskResult | null
  point: Point | null
  disabled: boolean
  onClickPoint: (point: Point) => void
}

export function CanvasStage({ bitmap, mask, point, disabled, onClickPoint }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !bitmap) return

    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0)

    if (mask && mask.width === canvas.width && mask.height === canvas.height) {
      const overlayData = ctx.createImageData(canvas.width, canvas.height)
      for (let i = 0; i < mask.data.length; i++) {
        if (mask.data[i] > 0) {
          const o = i * 4
          overlayData.data[o] = 56
          overlayData.data[o + 1] = 189
          overlayData.data[o + 2] = 248
          overlayData.data[o + 3] = 130
        }
      }
      // putImageDataは既存ピクセルと合成できないため、一旦別canvasに描いてから
      // drawImageで重ねることでアルファ合成する
      const overlayCanvas = new OffscreenCanvas(canvas.width, canvas.height)
      const octx = overlayCanvas.getContext('2d')
      if (octx) {
        octx.putImageData(overlayData, 0, 0)
        ctx.drawImage(overlayCanvas, 0, 0)
      }
    }

    if (point) {
      const radius = Math.max(4, canvas.width * 0.006)
      ctx.beginPath()
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
      ctx.fillStyle = '#f97316'
      ctx.fill()
      ctx.lineWidth = Math.max(1.5, canvas.width * 0.0015)
      ctx.strokeStyle = '#ffffff'
      ctx.stroke()
    }
  }, [bitmap, mask, point])

  function handleClick(e: MouseEvent<HTMLCanvasElement>) {
    if (disabled) return
    const canvas = canvasRef.current
    if (!canvas || canvas.width === 0) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = Math.round((e.clientX - rect.left) * scaleX)
    const y = Math.round((e.clientY - rect.top) * scaleY)
    onClickPoint({ x, y })
  }

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      className={`canvas-stage${disabled ? ' canvas-stage--disabled' : ''}`}
    />
  )
}
