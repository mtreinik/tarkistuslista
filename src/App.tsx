import type { FormEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { localeOptions, messages, toIntlLocale, type Locale } from './i18n'
import {
  type AppState,
  type ChecklistInstance,
  type ChecklistInstanceItem,
  type ChecklistTemplate,
  createChecklistInstance,
  createChecklistTemplate,
  getLatestInstanceForTemplate,
  loadAppState,
  normalizeAppState,
  saveAppState,
} from './storage'

function byTitle(
  left: ChecklistTemplate,
  right: ChecklistTemplate,
  locale: Locale,
) {
  return left.title.localeCompare(right.title, toIntlLocale(locale), {
    sensitivity: 'base',
  })
}

function byCheckedOrder(
  left: ChecklistInstanceItem,
  right: ChecklistInstanceItem,
) {
  return (left.checkedOrder ?? 0) - (right.checkedOrder ?? 0)
}

function byLabel(
  left: ChecklistInstanceItem,
  right: ChecklistInstanceItem,
  locale: Locale,
) {
  return left.label.localeCompare(right.label, toIntlLocale(locale), {
    sensitivity: 'base',
  })
}

function byStartedAtDescending(
  left: ChecklistInstance,
  right: ChecklistInstance,
) {
  return new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime()
}

function formatStartedAt(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getCheckedItems(items: ChecklistInstanceItem[]) {
  return items.filter((item) => item.checkedOrder !== null).sort(byCheckedOrder)
}

function getUncheckedItems(items: ChecklistInstanceItem[], locale: Locale) {
  return items
    .filter((item) => item.checkedOrder === null)
    .sort((left, right) => byLabel(left, right, locale))
}

function reorderAfterRemovingCheckedItem(
  items: ChecklistInstanceItem[],
  removedOrder: number,
) {
  return items.map((item) => {
    if (item.checkedOrder !== null && item.checkedOrder > removedOrder) {
      return {
        ...item,
        checkedOrder: item.checkedOrder - 1,
      }
    }

    return item
  })
}

function removeItemFromInstance(
  items: ChecklistInstanceItem[],
  itemId: string,
) {
  const removedItem = items.find((item) => item.id === itemId)

  if (!removedItem) {
    return items
  }

  const remainingItems = items.filter((item) => item.id !== itemId)

  if (removedItem.checkedOrder === null) {
    return remainingItems
  }

  return reorderAfterRemovingCheckedItem(remainingItems, removedItem.checkedOrder)
}

function updateLatestInstanceForTemplate(
  instances: ChecklistInstance[],
  templateId: string,
  updater: (instance: ChecklistInstance) => ChecklistInstance,
) {
  const latestInstance = getLatestInstanceForTemplate(instances, templateId)

  if (!latestInstance) {
    return instances
  }

  return instances.map((instance) =>
    instance.id === latestInstance.id ? updater(instance) : instance,
  )
}

type ChecklistColumnProps = {
  title: string
  items: ChecklistInstanceItem[]
  emptyMessage: string
  showOrder?: boolean
  onItemPress?: (itemId: string) => void
  movingItemId?: string | null
  movingDirection?: 'to-checked' | 'to-unchecked' | null
}

function ChecklistColumn({
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

type ViewMode = 'checklist' | 'template' | 'history'

function App() {
  const [appState, setAppState] = useState<AppState>(() => loadAppState())
  const [newChecklistTitle, setNewChecklistTitle] = useState('')
  const [newItemLabel, setNewItemLabel] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('checklist')
  const [isCreatingChecklist, setIsCreatingChecklist] = useState(false)
  const [movingItem, setMovingItem] = useState<{
    itemId: string
    direction: 'to-checked' | 'to-unchecked'
  } | null>(null)
  const moveTimeoutRef = useRef<number | null>(null)
  const titleInputRef = useRef<HTMLInputElement | null>(null)
  const text = messages[appState.locale]

  useEffect(() => {
    saveAppState(appState)
  }, [appState])

  useEffect(() => {
    return () => {
      if (moveTimeoutRef.current !== null) {
        window.clearTimeout(moveTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (isCreatingChecklist && viewMode === 'template') {
      titleInputRef.current?.focus()
    }
  }, [isCreatingChecklist, viewMode])

  useEffect(() => {
    document.documentElement.lang = toIntlLocale(appState.locale)
  }, [appState.locale])

  const sortedTemplates = useMemo(
    () => [...appState.templates].sort((left, right) => byTitle(left, right, appState.locale)),
    [appState.locale, appState.templates],
  )

  const selectedTemplate = useMemo(
    () =>
      appState.templates.find(
        (template) => template.id === appState.selectedTemplateId,
      ) ?? appState.templates[0],
    [appState.selectedTemplateId, appState.templates],
  )

  const activeInstance = useMemo(
    () =>
      selectedTemplate
        ? getLatestInstanceForTemplate(appState.instances, selectedTemplate.id)
        : undefined,
    [appState.instances, selectedTemplate],
  )

  const historyInstances = useMemo(
    () =>
      appState.instances
        .filter((instance) => instance.id !== activeInstance?.id)
        .sort(byStartedAtDescending),
    [activeInstance?.id, appState.instances],
  )

  const selectedHistoryInstance = useMemo(() => {
    if (historyInstances.length === 0) {
      return null
    }

    return (
      historyInstances.find(
        (instance) => instance.id === appState.selectedHistoryInstanceId,
      ) ?? historyInstances[0]
    )
  }, [appState.selectedHistoryInstanceId, historyInstances])

  const updateState = (updater: (state: AppState) => AppState) => {
    setAppState((currentState) => normalizeAppState(updater(currentState)))
  }

  if (!selectedTemplate || !activeInstance) {
    return null
  }

  const uncheckedItems = getUncheckedItems(activeInstance.items, appState.locale)
  const checkedItems = getCheckedItems(activeInstance.items)
  const historyUncheckedItems = selectedHistoryInstance
    ? getUncheckedItems(selectedHistoryInstance.items, appState.locale)
    : []
  const historyCheckedItems = selectedHistoryInstance
    ? getCheckedItems(selectedHistoryInstance.items)
    : []
  const duplicateNewChecklistTitle = appState.templates.some(
    (template) =>
      template.title.toLowerCase() === newChecklistTitle.trim().toLowerCase(),
  )

  const toggleItem = (itemId: string) => {
    if (movingItem) {
      return
    }

    const targetItem = activeInstance.items.find((item) => item.id === itemId)

    if (!targetItem) {
      return
    }

    const direction =
      targetItem.checkedOrder === null ? 'to-checked' : 'to-unchecked'

    setMovingItem({
      itemId,
      direction,
    })

    moveTimeoutRef.current = window.setTimeout(() => {
    updateState((state) => ({
      ...state,
      instances: updateLatestInstanceForTemplate(
        state.instances,
        selectedTemplate.id,
        (instance) => {
          const targetItem = instance.items.find((item) => item.id === itemId)

          if (!targetItem) {
            return instance
          }

          if (targetItem.checkedOrder === null) {
            const nextOrder = getCheckedItems(instance.items).length + 1

            return {
              ...instance,
              items: instance.items.map((item) =>
                item.id === itemId
                  ? {
                      ...item,
                      checkedOrder: nextOrder,
                    }
                  : item,
              ),
            }
          }

          return {
            ...instance,
            items: reorderAfterRemovingCheckedItem(
              instance.items.map((item) =>
                item.id === itemId
                  ? {
                      ...item,
                      checkedOrder: null,
                    }
                  : item,
              ),
              targetItem.checkedOrder,
            ),
          }
        },
      ),
    }))
      setMovingItem(null)
      moveTimeoutRef.current = null
    }, 180)
  }

  const handleCreateChecklist = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const title = newChecklistTitle.trim()

    if (!title) {
      return
    }

    const duplicateTitle = appState.templates.some(
      (template) => template.title.toLowerCase() === title.toLowerCase(),
    )

    if (duplicateTitle) {
      return
    }

    const template = createChecklistTemplate(title, [])
    const instance = createChecklistInstance(template)

    updateState((state) => ({
      ...state,
      templates: [...state.templates, template],
      instances: [...state.instances, instance],
      selectedTemplateId: template.id,
    }))

    setNewChecklistTitle('')
    setIsCreatingChecklist(false)
    setViewMode('template')
  }

  const handleStartFreshChecklist = () => {
    const nextInstance = createChecklistInstance(selectedTemplate)

    updateState((state) => ({
      ...state,
      instances: [...state.instances, nextInstance],
    }))
  }

  const handleSaveTitle = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const nextTitle = String(formData.get('title') ?? '').trim()
    const titleExists = appState.templates.some(
      (template) =>
        template.id !== selectedTemplate.id &&
        template.title.toLowerCase() === nextTitle.toLowerCase(),
    )

    if (!nextTitle || titleExists || nextTitle === selectedTemplate.title) {
      return
    }

    const nextUpdatedAt = new Date().toISOString()

    updateState((state) => ({
      ...state,
      templates: state.templates.map((template) =>
        template.id === selectedTemplate.id
          ? {
              ...template,
              title: nextTitle,
              updatedAt: nextUpdatedAt,
            }
          : template,
      ),
      instances: updateLatestInstanceForTemplate(
        state.instances,
        selectedTemplate.id,
        (instance) => ({
          ...instance,
          title: nextTitle,
        }),
      ),
    }))
  }

  const handleAddItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const label = newItemLabel.trim()

    if (!label) {
      return
    }

    const nextItem = {
      id: crypto.randomUUID(),
      label,
    }
    const nextUpdatedAt = new Date().toISOString()

    updateState((state) => ({
      ...state,
      templates: state.templates.map((template) =>
        template.id === selectedTemplate.id
          ? {
              ...template,
              items: [...template.items, nextItem],
              updatedAt: nextUpdatedAt,
            }
          : template,
      ),
      instances: updateLatestInstanceForTemplate(
        state.instances,
        selectedTemplate.id,
        (instance) => ({
          ...instance,
          items: [
            ...instance.items,
            {
              ...nextItem,
              checkedOrder: null,
            },
          ],
        }),
      ),
    }))

    setNewItemLabel('')
  }

  const handleRenameItem = (
    itemId: string,
    previousLabel: string,
    nextLabel: string,
    input: HTMLInputElement,
  ) => {
    const trimmedLabel = nextLabel.trim()

    if (!trimmedLabel) {
      input.value = previousLabel
      return
    }

    if (trimmedLabel === previousLabel) {
      return
    }

    const nextUpdatedAt = new Date().toISOString()

    updateState((state) => ({
      ...state,
      templates: state.templates.map((template) =>
        template.id === selectedTemplate.id
          ? {
              ...template,
              items: template.items.map((item) =>
                item.id === itemId
                  ? {
                      ...item,
                      label: trimmedLabel,
                    }
                  : item,
              ),
              updatedAt: nextUpdatedAt,
            }
          : template,
      ),
      instances: updateLatestInstanceForTemplate(
        state.instances,
        selectedTemplate.id,
        (instance) => ({
          ...instance,
          items: instance.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  label: trimmedLabel,
                }
              : item,
          ),
        }),
      ),
    }))
  }

  const handleRemoveItem = (itemId: string) => {
    const nextUpdatedAt = new Date().toISOString()

    updateState((state) => ({
      ...state,
      templates: state.templates.map((template) =>
        template.id === selectedTemplate.id
          ? {
              ...template,
              items: template.items.filter((item) => item.id !== itemId),
              updatedAt: nextUpdatedAt,
            }
          : template,
      ),
      instances: updateLatestInstanceForTemplate(
        state.instances,
        selectedTemplate.id,
        (instance) => ({
          ...instance,
          items: removeItemFromInstance(instance.items, itemId),
        }),
      ),
    }))
  }

  const handleRemoveTemplate = () => {
    if (appState.templates.length <= 1) {
      return
    }

    const confirmed = window.confirm(
      text.removeChecklistConfirm(selectedTemplate.title),
    )

    if (!confirmed) {
      return
    }

    updateState((state) => {
      const remainingTemplates = state.templates.filter(
        (template) => template.id !== selectedTemplate.id,
      )

      return {
        ...state,
        templates: remainingTemplates,
        selectedTemplateId: remainingTemplates[0].id,
      }
    })
  }

  return (
    <main className="app-shell">
      <section className="top-tabs-panel">
        <div className="top-bar-row">
          <div
            className="tabs-scroll"
            role="tablist"
            aria-label={text.checklistTabsLabel}
          >
            {sortedTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                role="tab"
                aria-selected={
                  template.id === selectedTemplate.id && viewMode === 'checklist'
                }
                className={
                  template.id === selectedTemplate.id && viewMode === 'checklist'
                    ? 'chip-button chip-button--active'
                    : 'chip-button'
                }
                onClick={() => {
                  setIsCreatingChecklist(false)
                  setViewMode('checklist')
                  updateState((state) => ({
                    ...state,
                    selectedTemplateId: template.id,
                  }))
                }}
              >
                {template.title}
              </button>
            ))}
            <span className="tabs-separator" aria-hidden="true" />
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'history'}
              className={
                viewMode === 'history'
                  ? 'chip-button chip-button--active'
                  : 'chip-button'
              }
              onClick={() => {
                setIsCreatingChecklist(false)
                setViewMode('history')
              }}
            >
              {text.history}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'template'}
              className={
                viewMode === 'template'
                  ? 'chip-button chip-button--active'
                  : 'chip-button'
              }
              onClick={() => {
                setIsCreatingChecklist(false)
                setViewMode('template')
              }}
            >
              {text.templateEditor}
            </button>
            <label className="language-picker">
              <span className="sr-only">{text.languageLabel}</span>
              <select
                value={appState.locale}
                aria-label={text.languageLabel}
                onChange={(event) =>
                  updateState((state) => ({
                    ...state,
                    locale: event.target.value as Locale,
                  }))
                }
              >
                {localeOptions.map((locale) => (
                  <option key={locale} value={locale}>
                    {locale}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      {viewMode === 'checklist' ? (
      <section className="hero-panel">
        <p className="eyebrow">{text.appBadge}</p>
        <div className="hero-header">
          <div>
            <h1>{activeInstance.title}</h1>
            <p className="muted-text">
              {text.started(formatStartedAt(activeInstance.startedAt, appState.locale))}
            </p>
          </div>
          <button
            type="button"
            className="primary-button"
            onClick={handleStartFreshChecklist}
          >
            {text.newChecklistOf(activeInstance.title)}
          </button>
        </div>
        <div className="columns-grid columns-grid--split">
          <ChecklistColumn
            title={text.toCheckTitle(uncheckedItems.length)}
            items={uncheckedItems}
            emptyMessage={text.everythingChecked}
            onItemPress={toggleItem}
            movingItemId={movingItem?.direction === 'to-checked' ? movingItem.itemId : null}
            movingDirection={movingItem?.direction === 'to-checked' ? movingItem.direction : null}
          />
          <ChecklistColumn
            title={text.checkedTitle(checkedItems.length)}
            items={checkedItems}
            emptyMessage={text.nothingCheckedYet}
            showOrder
            onItemPress={toggleItem}
            movingItemId={movingItem?.direction === 'to-unchecked' ? movingItem.itemId : null}
            movingDirection={movingItem?.direction === 'to-unchecked' ? movingItem.direction : null}
          />
        </div>
      </section>
      ) : null}

      {viewMode === 'template' ? (
      <section className="panel template-panel">
        <div className="panel-header">
          <div>
            <h2>{text.templateEditor}</h2>
          </div>
          <div className="template-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setIsCreatingChecklist(true)
                setNewChecklistTitle('')
              }}
            >
              {text.newChecklist}
            </button>
            <button
              type="button"
              className="danger-button"
              onClick={handleRemoveTemplate}
              disabled={isCreatingChecklist || appState.templates.length <= 1}
            >
              {text.removeChecklist}
            </button>
          </div>
        </div>
        <form
          key={isCreatingChecklist ? 'new-checklist' : selectedTemplate.id}
          className="inline-form"
          onSubmit={isCreatingChecklist ? handleCreateChecklist : handleSaveTitle}
        >
          <label className="field field--wide">
            <span>{text.checklistTitleLabel}</span>
            {isCreatingChecklist ? (
              <input
                ref={titleInputRef}
                type="text"
                value={newChecklistTitle}
                onChange={(event) => setNewChecklistTitle(event.target.value)}
                placeholder={text.checklistTitlePlaceholder}
                required
              />
            ) : (
              <input
                name="title"
                type="text"
                defaultValue={selectedTemplate.title}
                placeholder={text.checklistTitlePlaceholder}
                required
              />
            )}
          </label>
          <button
            type="submit"
            className="secondary-button"
            disabled={
              isCreatingChecklist
                ? newChecklistTitle.trim().length === 0 || duplicateNewChecklistTitle
                : false
            }
          >
            {isCreatingChecklist ? text.createChecklist : text.saveTitle}
          </button>
        </form>
        <p className="section-subtitle">{text.checklistItemsLabel}</p>
        <div className="editor-list">
          {isCreatingChecklist ? (
            <p className="empty-state">{text.giveTitleFirst}</p>
          ) : selectedTemplate.items.length === 0 ? (
            <p className="empty-state">{text.noTemplateItems}</p>
          ) : (
            selectedTemplate.items.map((item) => (
              <div className="editor-row" key={`${item.id}-${item.label}`}>
                <input
                  type="text"
                  defaultValue={item.label}
                  aria-label={text.editItemAria(item.label)}
                  onBlur={(event) =>
                    handleRenameItem(
                      item.id,
                      item.label,
                       event.currentTarget.value,
                       event.currentTarget,
                    )
                  }
                />
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => handleRemoveItem(item.id)}
                >
                  {text.removeItem}
                </button>
              </div>
            ))
          )}
        </div>
        {isCreatingChecklist ? null : (
          <form className="inline-form" onSubmit={handleAddItem}>
            <label className="field field--wide">
              <span>{text.addTemplateItem}</span>
              <input
                type="text"
                value={newItemLabel}
                onChange={(event) => setNewItemLabel(event.target.value)}
                placeholder={text.addTemplateItemPlaceholder}
              />
            </label>
            <button
              type="submit"
              className="secondary-button"
              disabled={newItemLabel.trim().length === 0}
            >
              {text.addItem}
            </button>
          </form>
        )}
      </section>
      ) : null}

      {viewMode === 'history' ? (
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
                const checkedCount = getCheckedItems(instance.items).length
                const uncheckedCount = instance.items.length - checkedCount
                const selected = selectedHistoryInstance?.id === instance.id

                return (
                  <button
                    key={instance.id}
                    type="button"
                    className={
                      selected ? 'history-card history-card--active' : 'history-card'
                    }
                    onClick={() =>
                      updateState((state) => ({
                        ...state,
                        selectedHistoryInstanceId: instance.id,
                      }))
                    }
                  >
                    <strong>{instance.title}</strong>
                    <span>{text.started(formatStartedAt(instance.startedAt, appState.locale))}</span>
                    <span>{text.historySummary(uncheckedCount, checkedCount)}</span>
                  </button>
                )
              })}
            </div>
            {selectedHistoryInstance ? (
              <div className="history-preview">
                <div className="history-preview__header">
                  <div>
                    <h3>{selectedHistoryInstance.title}</h3>
                    <p className="muted-text">
                      {text.started(
                        formatStartedAt(
                          selectedHistoryInstance.startedAt,
                          appState.locale,
                        ),
                      )}
                    </p>
                  </div>
                </div>
                <div className="columns-grid columns-grid--split">
                  <ChecklistColumn
                    title={text.toCheckTitle(historyUncheckedItems.length)}
                    items={historyUncheckedItems}
                    emptyMessage={text.everythingWasChecked}
                  />
                  <ChecklistColumn
                    title={text.checkedTitle(historyCheckedItems.length)}
                    items={historyCheckedItems}
                    emptyMessage={text.nothingWasChecked}
                    showOrder
                  />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>
      ) : null}
    </main>
  )
}

export default App
