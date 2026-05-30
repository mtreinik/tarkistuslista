import { ChecklistColumn } from '../components/ChecklistColumn'
import type { Messages } from '../i18n'
import type { ChecklistInstance, ChecklistInstanceItem } from '../storage'

type ChecklistViewProps = {
  text: Messages
  activeInstance: ChecklistInstance
  startedAtLabel: string
  uncheckedItems: ChecklistInstanceItem[]
  checkedItems: ChecklistInstanceItem[]
  movingItem: {
    itemId: string
    direction: 'to-checked' | 'to-unchecked'
  } | null
  onToggleItem: (itemId: string) => void
  onStartFreshChecklist: () => void
}

export function ChecklistView({
  text,
  activeInstance,
  startedAtLabel,
  uncheckedItems,
  checkedItems,
  movingItem,
  onToggleItem,
  onStartFreshChecklist,
}: ChecklistViewProps) {
  return (
    <section className="hero-panel">
      <p className="eyebrow">{text.appBadge}</p>
      <div className="hero-header">
        <div>
          <h1>{activeInstance.title}</h1>
          <p className="muted-text">{startedAtLabel}</p>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={onStartFreshChecklist}
        >
          {text.newChecklistOf(activeInstance.title)}
        </button>
      </div>
      <div className="columns-grid columns-grid--split">
        <ChecklistColumn
          title={text.toCheckTitle(uncheckedItems.length, activeInstance.items.length)}
          items={uncheckedItems}
          emptyMessage={text.everythingChecked}
          onItemPress={onToggleItem}
          movingItemId={movingItem?.direction === 'to-checked' ? movingItem.itemId : null}
          movingDirection={movingItem?.direction === 'to-checked' ? movingItem.direction : null}
        />
        <ChecklistColumn
          title={text.checkedTitle(checkedItems.length, activeInstance.items.length)}
          items={checkedItems}
          emptyMessage={text.nothingCheckedYet}
          showOrder
          onItemPress={onToggleItem}
          movingItemId={movingItem?.direction === 'to-unchecked' ? movingItem.itemId : null}
          movingDirection={
            movingItem?.direction === 'to-unchecked' ? movingItem.direction : null
          }
        />
      </div>
    </section>
  )
}
