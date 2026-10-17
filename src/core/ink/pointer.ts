let penSeen = false

/** Once a pen (Apple Pencil) is used, finger touches are ignored so a resting palm doesn't draw. */
export function acceptPointer(pointerType: string): boolean {
  if (pointerType === 'pen') { penSeen = true; return true }
  return !(penSeen && pointerType === 'touch')
}

export function resetPenDetection(): void { penSeen = false }
export const isPenMode = (): boolean => penSeen
