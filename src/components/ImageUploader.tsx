import { useRef, type ChangeEvent } from 'react'

interface Props {
  presets: { id: string; label: string; url: string }[]
  selectedPresetId: string | null
  onSelectPreset: (id: string, url: string) => void
  onSelectFile: (file: File) => void
  disabled: boolean
}

export function ImageUploader({ presets, selectedPresetId, onSelectPreset, onSelectFile, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onSelectFile(file)
    // 同じファイルを再選択してもonChangeが発火するようにリセットする
    e.target.value = ''
  }

  return (
    <div className="image-uploader">
      <p className="image-uploader__label">サンプル画像から選ぶ</p>
      <div className="preset-list">
        {presets.map((preset) => (
          <button
            type="button"
            className={`preset-button${selectedPresetId === preset.id ? ' preset-button--selected' : ''}`}
            disabled={disabled}
            aria-pressed={selectedPresetId === preset.id}
            onClick={() => onSelectPreset(preset.id, preset.url)}
            key={preset.id}
          >
            <img src={preset.url} alt="" />
            <span>{preset.label}</span>
          </button>
        ))}
      </div>
      <div className="image-uploader__divider"><span>または</span></div>
      <button className="upload-button" type="button" disabled={disabled} onClick={() => inputRef.current?.click()}>
        画像をアップロード / 撮影
      </button>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleChange} hidden />
    </div>
  )
}
