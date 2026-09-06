import { describe, expect, it } from 'vitest'
import { buildQuizChoices } from './quiz'

describe('buildQuizChoices', () => {
  it('CLIPのlabelEnを語彙テーブルでid/labelJaに変換し、スコア順(=入力順)をtopに保持する', () => {
    const raw = [
      { label: 'a car', score: 0.7 },
      { label: 'a road surface', score: 0.2 },
      { label: 'a guardrail', score: 0.05 },
      { label: 'a pedestrian person', score: 0.03 },
    ]

    const { choices, top } = buildQuizChoices(raw)

    expect(top).toEqual([
      { id: 'car', labelJa: '自動車', score: 0.7 },
      { id: 'road', labelJa: '道路', score: 0.2 },
      { id: 'guardrail', labelJa: 'ガードレール', score: 0.05 },
    ])

    // 4番目(pedestrian)はtop3から溢れて選択肢には含まれない
    expect(choices).toHaveLength(4)
    const ids = choices.map((c) => c.id).sort()
    expect(ids).toEqual(['car', 'guardrail', 'other', 'road'])
  })

  it('「それ以外」の選択肢を必ず1件だけ含む', () => {
    const raw = [
      { label: 'a car', score: 0.9 },
      { label: 'the sky', score: 0.1 },
    ]

    const { choices } = buildQuizChoices(raw)
    const otherChoices = choices.filter((c) => c.isOther)

    expect(otherChoices).toEqual([{ id: 'other', labelJa: 'それ以外', isOther: true }])
  })

  it('固定ボキャブラリに存在しないラベルは無視する', () => {
    const raw = [
      { label: 'an unknown thing', score: 0.9 },
      { label: 'a car', score: 0.1 },
    ]

    const { choices, top } = buildQuizChoices(raw)

    expect(top).toEqual([{ id: 'car', labelJa: '自動車', score: 0.1 }])
    expect(choices).toHaveLength(2)
    expect(choices.some((c) => c.id === 'car' && !c.isOther)).toBe(true)
    expect(choices.some((c) => c.isOther)).toBe(true)
  })

  it('一致するラベルが1件もなくても「それ以外」だけの選択肢を返す', () => {
    const { choices, top } = buildQuizChoices([{ label: 'nothing recognizable', score: 1 }])

    expect(top).toEqual([])
    expect(choices).toEqual([{ id: 'other', labelJa: 'それ以外', isOther: true }])
  })

  it('選択肢のidに重複がない', () => {
    const raw = [
      { label: 'a car', score: 0.5 },
      { label: 'a road surface', score: 0.3 },
      { label: 'a guardrail', score: 0.2 },
    ]

    const { choices } = buildQuizChoices(raw)
    const ids = choices.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
