import { href } from './router'

export function NotFound() {
  return (
    <section class="not-found">
      <p>🤔 Page not found</p>
      <a class="button" href={href()}>🏠 Home</a>
    </section>
  )
}
