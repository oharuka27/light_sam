import type { QuizChoice } from '../lib/quiz'
import type { ClassificationResult } from '../types'

interface Props {
  choices: QuizChoice[]
  top: ClassificationResult[]
  selectedId: string | null
  onSelect: (id: string) => void
  onReset: () => void
}

export function QuizPanel({ choices, top, selectedId, onSelect, onReset }: Props) {
  const answered = selectedId !== null
  const aiTop = top[0] ?? null

  return (
    <div className="quiz-panel">
      <h3>これは何でしょう?</h3>
      <div className="quiz-choices">
        {choices.map((choice) => {
          const isSelected = choice.id === selectedId
          const isAiTop = answered && aiTop !== null && choice.id === aiTop.id
          const classes = ['quiz-choice']
          if (isSelected) classes.push('quiz-choice--selected')
          if (isAiTop) classes.push('quiz-choice--ai-top')
          return (
            <button
              key={choice.id}
              type="button"
              disabled={answered}
              onClick={() => onSelect(choice.id)}
              className={classes.join(' ')}
            >
              <span className="quiz-choice__label">{choice.labelJa}</span>
              {answered && (isSelected || isAiTop) && (
                <span className="quiz-choice__badges">
                  {isSelected && <span className="choice-badge choice-badge--user">あなた</span>}
                  {isAiTop && <span className="choice-badge choice-badge--ai">AI</span>}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {answered && (
        <div className="quiz-feedback">
          {aiTop ? (
            <p>
              AIの一番の予測: <strong>{aiTop.labelJa}</strong> ({Math.round(aiTop.score * 100)}%)
              {selectedId === aiTop.id ? ' — 一致しました!' : ' — あなたの選択とは異なりました'}
            </p>
          ) : (
            <p>AIは候補ラベルの中から自信のある予測を見つけられませんでした。</p>
          )}
          <button type="button" onClick={onReset}>
            別の場所をクリックする
          </button>
        </div>
      )}
    </div>
  )
}
