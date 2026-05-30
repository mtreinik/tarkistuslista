import type { ChecklistInstanceItem } from '../storage'

export type ChecklistColumnProps = {
  title: string
  items: ChecklistInstanceItem[]
  emptyMessage: string
  showOrder?: boolean
  onItemPress?: (itemId: string) => void
  movingItemId?: string | null
  movingDirection?: 'to-checked' | 'to-unchecked' | null
}

export function ChecklistColumn({
  title,
  items,
  emptyMessage,
  showOrder = false,
  onItemPress,
  movingItemId = null,
  movingDirection = null,
}: ChecklistColumnProps) {
  const interactive = typeof onItemPress === 'function'

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
            <li key={item.id}>
              {interactive ? (
                <button
                  type="button"
                  className={
                    item.id === movingItemId && movingDirection
                      ? `item-button item-button--${movingDirection}`
                      : 'item-button'
                  }
                  onClick={() => onItemPress(item.id)}
                  disabled={item.id === movingItemId}
                >
                  <span className="item-label">{item.label}</span>
                  {showOrder && item.checkedOrder !== null ? (
                    <span className="order-badge">{item.checkedOrder}</span>
                  ) : null}
                </button>
              ) : (
                <div className="item-card">
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
