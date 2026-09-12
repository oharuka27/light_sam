import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import { ImageUploader } from './components/ImageUploader'
import { CanvasStage } from './components/CanvasStage'
import { QuizPanel } from './components/QuizPanel'
import { LoadingOverlay } from './components/LoadingOverlay'
import { SamClient } from './lib/samClient'
import { ClipClient } from './lib/clipClient'
import { buildQuizChoices, type QuizResult } from './lib/quiz'
import { VOCABULARY } from './data/vocabulary'
import type { MaskResult, ModelLoadProgress, PipelineStage, Point } from './types'
import sample1 from '../sample/gecko.jpg'
import sample2 from '../sample/sturgeon.jpg'
import sample3 from '../sample/bear.jpg'
import sample4 from '../sample/hamster.jpg'
import sample5 from '../sample/crocodile.jpg'

const CANDIDATE_LABELS = VOCABULARY.map((v) => v.labelEn)
const PRESET_IMAGES = [
  { id: 'sample-1', label: '画像1', url: sample1 },
  { id: 'sample-2', label: '画像2', url: sample2 },
  { id: 'sample-3', label: '画像3', url: sample3 },
  { id: 'sample-4', label: '画像4', url: sample4 },
  { id: 'sample-5', label: '画像5', url: sample5 },
]

interface Bbox {
  x: number
  y: number
  width: number
  height: number
}

function padBbox(bbox: Bbox, imgWidth: number, imgHeight: number, ratio: number): Bbox {
  const padX = Math.round(bbox.width * ratio)
  const padY = Math.round(bbox.height * ratio)
  const x = Math.max(0, bbox.x - padX)
  const y = Math.max(0, bbox.y - padY)
  const width = Math.min(imgWidth, bbox.x + bbox.width + padX) - x
  const height = Math.min(imgHeight, bbox.y + bbox.height + padY) - y
  return { x, y, width, height }
}

function App() {
  const samRef = useRef<SamClient | null>(null)
  const clipRef = useRef<ClipClient | null>(null)
  const bitmapRef = useRef<ImageBitmap | null>(null)

  const [stage, setStage] = useState<PipelineStage>('loading-models')
  const [samProgress, setSamProgress] = useState<ModelLoadProgress | null>(null)
  const [clipProgress, setClipProgress] = useState<ModelLoadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [hasImage, setHasImage] = useState(false)
  const [point, setPoint] = useState<Point | null>(null)
  const [mask, setMask] = useState<MaskResult | null>(null)
  const [quiz, setQuiz] = useState<QuizResult | null>(null)
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null)
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)

  useEffect(() => {
    const sam = new SamClient()
    const clip = new ClipClient()
    samRef.current = sam
    clipRef.current = clip

    const offSam = sam.onProgress(setSamProgress)
    const offClip = clip.onProgress(setClipProgress)

    Promise.all([sam.loadModel(), clip.loadModel()])
      .then(() => setStage((s) => (s === 'loading-models' ? 'idle' : s)))
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err))
        setStage('error')
      })

    return () => {
      offSam()
      offClip()
      sam.terminate()
      clip.terminate()
      bitmapRef.current?.close()
    }
  }, [])

  const busy =
    stage === 'loading-models' || stage === 'encoding-image' || stage === 'decoding-mask' || stage === 'classifying'

  const modelProgressValues = [samProgress?.progress, clipProgress?.progress].filter(
    (value): value is number => value != null,
  )
  const modelProgress =
    modelProgressValues.length === 2
      ? modelProgressValues.reduce((sum, value) => sum + value, 0) / modelProgressValues.length
      : null
  const loadingMessage =
    stage === 'loading-models'
      ? 'データ読み込み中…'
      : stage === 'encoding-image'
        ? '読み込み中…'
        : 'AI処理中…'

  const loadImage = useCallback(async (image: Blob) => {
    const sam = samRef.current
    if (!sam) return

    setError(null)
    setPoint(null)
    setMask(null)
    setQuiz(null)
    setSelectedChoiceId(null)
    setStage('encoding-image')

    try {
      const [displayBitmap, workerBitmap] = await Promise.all([createImageBitmap(image), createImageBitmap(image)])

      bitmapRef.current?.close()
      bitmapRef.current = displayBitmap
      setHasImage(true)

      await sam.setImage(workerBitmap)
      setStage('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStage('error')
    }
  }, [])

  const handleSelectFile = useCallback(
    (file: File) => {
      setSelectedImageId(null)
      void loadImage(file)
    },
    [loadImage],
  )

  const handleSelectPreset = useCallback(
    async (id: string, url: string) => {
      setSelectedImageId(id)
      setStage('encoding-image')
      try {
        const response = await fetch(url)
        if (!response.ok) throw new Error('サンプル画像を読み込めませんでした')
        await loadImage(await response.blob())
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        setStage('error')
      }
    },
    [loadImage],
  )

  const handleClickPoint = useCallback(async (clicked: Point) => {
    const sam = samRef.current
    const clip = clipRef.current
    const bitmap = bitmapRef.current
    if (!sam || !clip || !bitmap) return

    setPoint(clicked)
    setMask(null)
    setQuiz(null)
    setSelectedChoiceId(null)
    setError(null)
    setStage('decoding-mask')

    try {
      const maskResult = await sam.decodePoint(clicked.x, clicked.y)
      setMask(maskResult)

      if (maskResult.bbox.width === 0 || maskResult.bbox.height === 0) {
        setStage('ready')
        return
      }

      setStage('classifying')
      const cropBox = padBbox(maskResult.bbox, bitmap.width, bitmap.height, 0.15)
      const cropBitmap = await createImageBitmap(bitmap, cropBox.x, cropBox.y, cropBox.width, cropBox.height)

      const raw = await clip.classify(cropBitmap, CANDIDATE_LABELS)
      setQuiz(buildQuizChoices(raw))
      setStage('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStage('error')
    }
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-kicker">AIといっしょに当ててみよう！</div>
        <h1><span aria-hidden="true">✨</span> 物体あてクイズ</h1>
        <p>画像を選んで、気になる場所をクリックしてみてください。</p>
      </header>

      <ImageUploader
        presets={PRESET_IMAGES}
        selectedPresetId={selectedImageId}
        onSelectPreset={handleSelectPreset}
        onSelectFile={handleSelectFile}
        disabled={busy}
      />

      {error && <p className="app-error">エラー: {error}</p>}

      {hasImage && (
        <div className="app-stage">
          <CanvasStage
            bitmap={bitmapRef.current}
            mask={mask}
            point={point}
            disabled={busy}
            onClickPoint={handleClickPoint}
          />
          {quiz && (
            <QuizPanel
              choices={quiz.choices}
              top={quiz.top}
              selectedId={selectedChoiceId}
              onSelect={setSelectedChoiceId}
              onReset={() => setSelectedChoiceId(null)}
            />
          )}
        </div>
      )}

      <LoadingOverlay visible={busy} message={loadingMessage} progress={stage === 'loading-models' ? modelProgress : null} />
    </div>
  )
}

export default App
