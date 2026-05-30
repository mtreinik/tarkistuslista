import { useRef } from 'react'
import { ChecklistColumn } from '../components/ChecklistColumn'
import type { Messages } from '../i18n'
import type { ChecklistInstance, ChecklistInstanceItem } from '../storage'

type HistoryViewProps = {
  text: Messages
  historyInstances: ChecklistInstance[]
  selectedHistoryInstance: ChecklistInstance | null
  historyUncheckedItems: ChecklistInstanceItem[]
  historyCheckedItems: ChecklistInstanceItem[]
  formatStartedLabel: (value: string) => string
  formatCheckedTime: (value: string) => string
  onSelectHistoryInstance: (instanceId: string) => void
}

export function HistoryView({
  text,
  historyInstances,
  selectedHistoryInstance,
  historyUncheckedItems,
  historyCheckedItems,
  formatStartedLabel,
  formatCheckedTime,
  onSelectHistoryInstance,
}: HistoryViewProps) {
  const historyPreviewRef = useRef<HTMLDivElement | null>(null)

  const handleSelectHistoryInstance = (instanceId: string) => {
    onSelectHistoryInstance(instanceId)

    if (!window.matchMedia('(max-width: 860px)').matches) {
      return
    }

    window.requestAnimationFrame(() => {
      historyPreviewRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{text.history}</h2>
        </div>
      </div>
      {historyInstances.length === 0 ? (
        <p className="empty-state">{text.historyEmpty}</p>
      ) : (
        <div className="history-layout">
          <div className="history-list">
            {historyInstances.map((instance) => {
              const checkedCount = instance.items.filter(
                (item) => item.checkedOrder !== null,
              ).length
              const uncheckedCount = instance.items.length - checkedCount
              const selected = selectedHistoryInstance?.id === instance.id

              return (
                <button
                  key={instance.id}
                  type="button"
                  className={
                    selected ? 'history-card history-card--active' : 'history-card'
                  }
                  onClick={() => handleSelectHistoryInstance(instance.id)}
                >
                  <strong>{instance.title}</strong>
                  <span>{formatStartedLabel(instance.startedAt)}</span>
                  <span>{text.historySummary(uncheckedCount, checkedCount)}</span>
                </button>
              )
            })}
          </div>
          {selectedHistoryInstance ? (
            <div className="history-preview" ref={historyPreviewRef}>
              <div className="history-preview__header">
                <div>
                  <h3>{selectedHistoryInstance.title}</h3>
                  <p className="muted-text">
                    {formatStartedLabel(selectedHistoryInstance.startedAt)}
                  </p>
                </div>
              </div>
              <div className="columns-grid columns-grid--split">
                <ChecklistColumn
                  key={`${selectedHistoryInstance.id}-unchecked`}
                  title={text.toCheckTitle(
                    historyUncheckedItems.length,
                    selectedHistoryInstance.items.length,
                  )}
                  items={historyUncheckedItems}
                  emptyMessage={text.everythingWasChecked}
                />
                <ChecklistColumn
                  key={`${selectedHistoryInstance.id}-checked`}
                  title={text.checkedTitle(
                    historyCheckedItems.length,
                    selectedHistoryInstance.items.length,
                  )}
                  items={historyCheckedItems}
                  emptyMessage={text.nothingWasChecked}
                  showOrder
                  formatCheckedTime={formatCheckedTime}
                  variant="checked"
                />
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}
