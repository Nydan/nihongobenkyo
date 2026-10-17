import { getAppStore } from '../core/storage'

export function Banner() {
  if (getAppStore().persistent) return null
  return <div class="banner" role="status">⚠️ Progress won't be saved on this device</div>
}
