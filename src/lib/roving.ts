import type { KeyboardEvent } from 'react'

const ITEM_SELECTOR = '[role="tab"], [role="radio"]'

/**
 * Arrow/Home/End inside a tablist or radiogroup (APG): selects the neighbour and moves focus to it. The caller
 * keeps one tab stop with `tabIndex={selected ? 0 : -1}` on each item and attaches this to the group's onKeyDown.
 */
export function rovingKey<T extends string>(
  event: KeyboardEvent<HTMLElement>,
  ids: readonly T[],
  active: T,
  choose: (id: T) => void,
) {
  const index = Math.max(0, ids.indexOf(active))
  const last = ids.length - 1
  const targets: Record<string, number> = {
    ArrowRight: index >= last ? 0 : index + 1,
    ArrowDown: index >= last ? 0 : index + 1,
    ArrowLeft: index <= 0 ? last : index - 1,
    ArrowUp: index <= 0 ? last : index - 1,
    Home: 0,
    End: last,
  }
  const next = targets[event.key]
  if (next === undefined) return
  event.preventDefault()
  choose(ids[next]!)
  event.currentTarget.querySelectorAll<HTMLElement>(ITEM_SELECTOR)[next]?.focus()
}
