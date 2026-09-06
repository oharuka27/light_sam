import { useRef, type ChangeEvent } from 'react'

interface Props {
  onSelect: (file: File) => void
  disabled: boolean
}

export function ImageUploader({ onSelect, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onSelect(file)
    // 同じファイルを再選択してもonChangeが発火するようにリセットする
    e.target.value = ''
  }

  return (
    <div className="image-uploader">
      <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()}>
        画像を選択 / 撮影
      </button>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleChange} hidden />
    </div>
  )
}
