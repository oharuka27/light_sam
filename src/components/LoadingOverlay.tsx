import type { ModelLoadProgress } from '../types'

interface Props {
  visible: boolean
  sam: ModelLoadProgress | null
  clip: ModelLoadProgress | null
}

export function LoadingOverlay({ visible, sam, clip }: Props) {
  if (!visible) return null

  return (
    <div className="loading-overlay">
      <div className="loading-card">
        <p>モデルを読み込み中です(初回のみ、数十MB〜のダウンロードが発生します)</p>
        <ProgressLine label="SAM(領域切り出し)" info={sam} />
        <ProgressLine label="CLIP(分類)" info={clip} />
      </div>
    </div>
  )
}

function ProgressLine({ label, info }: { label: string; info: ModelLoadProgress | null }) {
  const pct = info?.progress != null ? Math.round(info.progress) : null
  return (
    <div className="loading-line">
      <span>{label}</span>
      <span>
        {info?.status ?? '待機中'}
        {pct != null ? ` (${pct}%)` : ''}
      </span>
    </div>
  )
}
