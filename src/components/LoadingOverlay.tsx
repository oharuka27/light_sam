interface Props {
  visible: boolean
  message: string
}

export function LoadingOverlay({ visible, message }: Props) {
  if (!visible) return null

  return (
    <div className="loading-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="loading-card" aria-label={message}>
        <p>{message}</p>
        <div
          className="loading-progress loading-progress--indeterminate"
          role="progressbar"
          aria-label={message}
        >
          <span />
        </div>
      </div>
    </div>
  )
}
