import { render } from 'preact'
import { kanaModule } from './modules/kana'
import { App } from './shell/App'
import './shell/styles.css'

render(<App modules={[kanaModule]} />, document.getElementById('app')!)
