import { getKanaData } from './data'

export function ModelCard({ char }: { char: string }) {
  return (
    <div class="model" data-testid="model" aria-label={`Model: ${char}`}>
      <svg viewBox="0 0 109 109">
        {getKanaData(char).strokes.map((d, i) => <path key={i} d={d} class="ref-stroke" />)}
      </svg>
    </div>
  )
}
