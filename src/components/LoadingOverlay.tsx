interface Props {
  visible: boolean
  message: string
  progress?: number | null
}

export function LoadingOverlay({ visible, message, progress = null }: Props) {
  if (!visible) return null

  const percentage = progress == null ? null : Math.max(0, Math.min(100, Math.round(progress)))

  return (
    <div className="loading-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="loading-card" aria-label={message}>
        <p>{message}</p>
        <div
          className={`loading-progress${percentage == null ? ' loading-progress--indeterminate' : ''}`}
          role="progressbar"
          aria-label={message}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentage ?? undefined}
        >
          <span style={percentage == null ? undefined : { width: `${percentage}%` }} />
        </div>
        {percentage != null && <span className="loading-percentage">{percentage}%</span>}
      </div>
    </div>
  )
}
