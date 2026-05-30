import { ChecklistColumn } from '../components/ChecklistColumn'
import type { Messages } from '../i18n'
import type { ChecklistInstance, ChecklistInstanceItem } from '../storage'

type ChecklistViewProps = {
  text: Messages
  activeInstance: ChecklistInstance
  startedAtLabel: string
  uncheckedItems: ChecklistInstanceItem[]
  checkedItems: ChecklistInstanceItem[]
  hiddenItemIds: string[]
  uncheckedLayoutAnimationDuration: number
  checkedLayoutAnimationDuration: number
  onRegisterItemElement: (itemId: string, element: HTMLElement | null) => void
  onToggleItem: (itemId: string) => void
}

export function ChecklistView({
  text,
  activeInstance,
  startedAtLabel,
  uncheckedItems,
  checkedItems,
  hiddenItemIds,
  uncheckedLayoutAnimationDuration,
  checkedLayoutAnimationDuration,
  onRegisterItemElement,
  onToggleItem,
}: ChecklistViewProps) {
  return (
    <section className="hero-panel">
      <p className="eyebrow">{text.appBadge}</p>
      <div className="hero-header">
        <div>
          <h1>{activeInstance.title}</h1>
          <p className="muted-text">{startedAtLabel}</p>
        </div>
      </div>
      <div className="columns-grid columns-grid--split">
        <ChecklistColumn
          key={`${activeInstance.id}-unchecked`}
          title={text.toCheckTitle(uncheckedItems.length, activeInstance.items.length)}
          items={uncheckedItems}
          emptyMessage={text.everythingChecked}
          onItemPress={onToggleItem}
          hiddenItemIds={hiddenItemIds}
          onItemElement={onRegisterItemElement}
          layoutAnimationDuration={uncheckedLayoutAnimationDuration}
        />
        <ChecklistColumn
          key={`${activeInstance.id}-checked`}
          title={text.checkedTitle(checkedItems.length, activeInstance.items.length)}
          items={checkedItems}
          emptyMessage={text.nothingCheckedYet}
          showOrder
          variant="checked"
          onItemPress={onToggleItem}
          hiddenItemIds={hiddenItemIds}
          onItemElement={onRegisterItemElement}
          layoutAnimationDuration={checkedLayoutAnimationDuration}
        />
      </div>
    </section>
  )
}
