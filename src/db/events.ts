type Listener = () => void

const listeners = new Set<Listener>()

export function emitLocalWrite(): void {
  for (const cb of listeners) cb()
}

export function onLocalWrite(cb: Listener): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}
