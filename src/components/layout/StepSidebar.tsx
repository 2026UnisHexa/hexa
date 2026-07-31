export const CREATE_STEPS = [
  { id: 1, label: '녹음', title: 'step 1.\n허밍 녹음' },
  { id: 2, label: '악보', title: 'step 2.\n악보 확인' },
  { id: 3, label: '코드 제안', title: 'step 3.\n코드 진행 제안' },
  { id: 4, label: '장르 선택', title: 'step 4.\n장르 선택' },
  { id: 5, label: '다운로드', title: 'step 5.\n다운로드 및 등록' },
] as const

type Props = {
  currentStep: number
  maxReached: number
  onSelect: (step: number) => void
}

export function StepSidebar({ currentStep, maxReached, onSelect }: Props) {
  return (
    <aside className="step-sidebar" aria-label="작업 단계">
      {CREATE_STEPS.map((step) => {
        const isActive = step.id === currentStep
        const isDone = step.id < currentStep
        const unlocked = step.id <= maxReached
        return (
          <button
            key={step.id}
            type="button"
            className={`step-sidebar__item${isActive ? ' is-active' : ''}${isDone ? ' is-done' : ''}`}
            disabled={!unlocked}
            onClick={() => onSelect(step.id)}
          >
            <span className="step-sidebar__num">{step.id}</span>
            <span>{step.label}</span>
          </button>
        )
      })}
    </aside>
  )
}
