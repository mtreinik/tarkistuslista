import { useLayoutEffect, useRef } from 'react'
import type { ChecklistInstanceItem } from '../storage'

export type ChecklistColumnProps = {
  title: string
  items: ChecklistInstanceItem[]
  emptyMessage: string
  showOrder?: boolean
  variant?: 'default' | 'checked'
  onItemPress?: (itemId: string) => void
  hiddenItemIds?: readonly string[]
  onItemElement?: (itemId: string, element: HTMLElement | null) => void
  layoutAnimationDuration?: number
}

export function ChecklistColumn({
  title,
  items,
  emptyMessage,
  showOrder = false,
  variant = 'default',
  onItemPress,
  hiddenItemIds = [],
  onItemElement,
  layoutAnimationDuration = 320,
}: ChecklistColumnProps) {
  const interactive = typeof onItemPress === 'function'
  const itemClassName =
    variant === 'checked' ? 'item-card item-card--checked' : 'item-card'
  const buttonClassName = (itemId: string) =>
    hiddenItemIds.includes(itemId)
      ? variant === 'checked'
        ? 'item-button item-card--checked item-button--hidden'
        : 'item-button item-button--hidden'
      : variant === 'checked'
        ? 'item-button item-card--checked'
        : 'item-button'
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map())
  const previousPositionsRef = useRef<Map<string, number>>(new Map())

  useLayoutEffect(() => {
    const nextPositions = new Map<string, number>()
    const listTop = itemRefs.current
      .values()
      .next().value
      ?.parentElement?.getBoundingClientRect().top

    items.forEach((item) => {
      const element = itemRefs.current.get(item.id)

      if (element && listTop !== undefined) {
        nextPositions.set(item.id, element.getBoundingClientRect().top - listTop)
      }
    })

    if (previousPositionsRef.current.size === 0) {
      previousPositionsRef.current = nextPositions
      return
    }

    items.forEach((item) => {
      const element = itemRefs.current.get(item.id)

      if (!element) {
        return
      }

      const previousTop = previousPositionsRef.current.get(item.id)
      const nextTop = nextPositions.get(item.id)

      if (nextTop === undefined) {
        return
      }

      if (previousTop === undefined) {
        element.animate(
          [
            {
              opacity: 0,
              transform: 'translateY(20px) scale(0.98)',
            },
            {
              opacity: 1,
              transform: 'translateY(0) scale(1)',
            },
          ],
          {
            duration: layoutAnimationDuration,
            easing: 'ease-out',
          },
        )
        return
      }

      const deltaY = previousTop - nextTop

      if (Math.abs(deltaY) < 1) {
        return
      }

      element.animate(
        [
          {
            transform: `translateY(${deltaY}px)`,
          },
          {
            transform: 'translateY(0)',
          },
        ],
        {
          duration: layoutAnimationDuration,
          easing: 'ease-out',
        },
      )
    })

    previousPositionsRef.current = nextPositions
  }, [items, layoutAnimationDuration])

  return (
    <section className="checklist-column">
      <div className="column-header">
        <h3>{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="empty-state">{emptyMessage}</p>
      ) : (
        <ul className="item-list">
          {items.map((item) => (
            <li
              key={item.id}
              className="item-list__entry"
              ref={(element) => {
                if (element) {
                  itemRefs.current.set(item.id, element)
                } else {
                  itemRefs.current.delete(item.id)
                }
              }}
            >
              {interactive ? (
                <button
                  type="button"
                  className={buttonClassName(item.id)}
                  onClick={() => onItemPress(item.id)}
                  disabled={hiddenItemIds.includes(item.id)}
                  ref={(element) => onItemElement?.(item.id, element)}
                >
                  <span className="item-label">{item.label}</span>
                  {showOrder && item.checkedOrder !== null ? (
                    <span className="order-badge">{item.checkedOrder}</span>
                  ) : null}
                </button>
              ) : (
                <div
                  className={
                    hiddenItemIds.includes(item.id)
                      ? `${itemClassName} item-card--hidden`
                      : itemClassName
                  }
                  ref={(element) => onItemElement?.(item.id, element)}
                >
                  <span className="item-label">{item.label}</span>
                  {showOrder && item.checkedOrder !== null ? (
                    <span className="order-badge">{item.checkedOrder}</span>
                  ) : null}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
