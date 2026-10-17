import { href } from '../../core/router'

export function KanaHome() {
  return (
    <section class="kana-home">
      <h1>✍️ Kana Writing</h1>
      <div class="tiles">
        <a class="tile" href={href('kana', 'hiragana')}><span class="tile-icon" lang="ja">あ</span><span>Hiragana</span></a>
        <a class="tile" href={href('kana', 'katakana')}><span class="tile-icon" lang="ja">ア</span><span>Katakana</span></a>
      </div>
    </section>
  )
}
