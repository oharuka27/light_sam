import { VOCABULARY, OTHER_CHOICE } from '../data/vocabulary'
import type { ClassificationResult } from '../types'
import type { RawClassification } from './clipClient'

export interface QuizChoice {
  id: string
  labelJa: string
  isOther: boolean
}

export interface QuizResult {
  choices: QuizChoice[]
  /** CLIPスコア上位3件(順位はスコア降順のまま、UI表示用) */
  top: ClassificationResult[]
}

// CLIPのゼロショット分類結果(英語ラベル)を語彙テーブルで日本語表示に変換し、
// 上位3件+「それ以外」をシャッフルしてクイズの選択肢にする。
export function buildQuizChoices(raw: RawClassification[]): QuizResult {
  const byLabelEn = new Map(VOCABULARY.map((v) => [v.labelEn, v]))

  const ranked: ClassificationResult[] = raw
    .map((r) => {
      const item = byLabelEn.get(r.label)
      return item ? { id: item.id, labelJa: item.labelJa, score: r.score } : null
    })
    .filter((v): v is ClassificationResult => v !== null)

  const top3 = ranked.slice(0, 3)

  const choices = shuffle<QuizChoice>([
    ...top3.map((c) => ({ id: c.id, labelJa: c.labelJa, isOther: false })),
    { id: OTHER_CHOICE.id, labelJa: OTHER_CHOICE.labelJa, isOther: true },
  ])

  return { choices, top: top3 }
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}
