export const Stars = ({ n }: { n: number }) => (
  <span class="stars" aria-label={`${n} of 3 stars`}>{'⭐'.repeat(n)}{'☆'.repeat(3 - n)}</span>
)
