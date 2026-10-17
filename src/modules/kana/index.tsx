import type { LearningModule } from '../../core/module'
import { KanaHome } from './KanaHome'

export const kanaModule: LearningModule = {
  id: 'kana',
  title: 'Kana Writing',
  icon: 'あ',
  progressKey: 'kana',
  routes: [{ path: '', render: () => <KanaHome /> }],
}
