import { useEffect, useRef, type MouseEvent } from 'react'
import type { MaskResult, Point } from '../types'

const STAGE_WIDTH = 960
const STAGE_HEIGHT = 600

function getImagePlacement(bitmap: ImageBitmap) {
  const scale = Math.min(STAGE_WIDTH / bitmap.width, STAGE_HEIGHT / bitmap.height)
  const width = bitmap.width * scale
  const height = bitmap.height * scale
  return {
    scale,
    x: (STAGE_WIDTH - width) / 2,
    y: (STAGE_HEIGHT - height) / 2,
    width,
    height,
  }
}

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

    canvas.width = STAGE_WIDTH
    canvas.height = STAGE_HEIGHT
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#fff7ed'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const placement = getImagePlacement(bitmap)
    ctx.drawImage(bitmap, placement.x, placement.y, placement.width, placement.height)

    if (mask && mask.width === bitmap.width && mask.height === bitmap.height) {
      const overlayData = ctx.createImageData(mask.width, mask.height)
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
      const overlayCanvas = new OffscreenCanvas(mask.width, mask.height)
      const octx = overlayCanvas.getContext('2d')
      if (octx) {
        octx.putImageData(overlayData, 0, 0)
        ctx.drawImage(overlayCanvas, placement.x, placement.y, placement.width, placement.height)
      }
    }

    if (point) {
      const displayX = placement.x + point.x * placement.scale
      const displayY = placement.y + point.y * placement.scale
      const radius = 7
      ctx.beginPath()
      ctx.arc(displayX, displayY, radius, 0, Math.PI * 2)
      ctx.fillStyle = '#f97316'
      ctx.fill()
      ctx.lineWidth = 3
      ctx.strokeStyle = '#ffffff'
      ctx.stroke()
    }
  }, [bitmap, mask, point])

  function handleClick(e: MouseEvent<HTMLCanvasElement>) {
    if (disabled) return
    const canvas = canvasRef.current
    if (!canvas || canvas.width === 0) return
    const rect = canvas.getBoundingClientRect()
    if (!bitmap) return
    const canvasX = (e.clientX - rect.left) * (canvas.width / rect.width)
    const canvasY = (e.clientY - rect.top) * (canvas.height / rect.height)
    const placement = getImagePlacement(bitmap)
    if (
      canvasX < placement.x ||
      canvasX > placement.x + placement.width ||
      canvasY < placement.y ||
      canvasY > placement.y + placement.height
    ) return
    const x = Math.min(bitmap.width - 1, Math.max(0, Math.round((canvasX - placement.x) / placement.scale)))
    const y = Math.min(bitmap.height - 1, Math.max(0, Math.round((canvasY - placement.y) / placement.scale)))
    onClickPoint({ x, y })
  }

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      aria-label="物体を選択する画像"
      className={`canvas-stage${disabled ? ' canvas-stage--disabled' : ''}`}
    />
  )
}
