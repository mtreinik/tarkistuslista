import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { messages, toIntlLocale, type Locale } from './i18n'
import { AppMenu } from './components/AppMenu'
import { HistoryView } from './views/HistoryView'
import { ChecklistView } from './views/ChecklistView'
import { TemplateEditorView } from './views/TemplateEditorView'
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

type ViewMode = 'checklist' | 'template' | 'history'

function App() {
  const [appState, setAppState] = useState<AppState>(() => loadAppState())
  const [newChecklistTitle, setNewChecklistTitle] = useState('')
  const [newItemLabel, setNewItemLabel] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('checklist')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCreatingChecklist, setIsCreatingChecklist] = useState(false)
  const [movingItem, setMovingItem] = useState<{
    itemId: string
    direction: 'to-checked' | 'to-unchecked'
  } | null>(null)
  const moveTimeoutRef = useRef<number | null>(null)
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

  const handleCreateChecklist = (title: string) => {
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

  const handleSaveTitle = (nextTitle: string) => {
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

  const handleAddItem = (label: string) => {
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

  const handleRenameItem = (itemId: string, nextLabel: string) => {
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
                      label: nextLabel,
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
                  label: nextLabel,
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

  const handleSelectTemplate = (templateId: string) => {
    setIsCreatingChecklist(false)
    setViewMode('checklist')
    setIsMenuOpen(false)
    updateState((state) => ({
      ...state,
      selectedTemplateId: templateId,
    }))
  }

  const handleSelectViewMode = (mode: ViewMode) => {
    setIsCreatingChecklist(false)
    setViewMode(mode)
    setIsMenuOpen(false)
  }

  const handleSelectHistoryInstance = (instanceId: string) => {
    updateState((state) => ({
      ...state,
      selectedHistoryInstanceId: instanceId,
    }))
  }

  const formatStartedLabel = (value: string) =>
    text.started(formatStartedAt(value, appState.locale))

  const activeView =
    viewMode === 'checklist' ? (
      <ChecklistView
        text={text}
        activeInstance={activeInstance}
        startedAtLabel={formatStartedLabel(activeInstance.startedAt)}
        uncheckedItems={uncheckedItems}
        checkedItems={checkedItems}
        movingItem={movingItem}
        onToggleItem={toggleItem}
        onStartFreshChecklist={handleStartFreshChecklist}
      />
    ) : viewMode === 'template' ? (
      <TemplateEditorView
        text={text}
        templates={appState.templates}
        selectedTemplate={selectedTemplate}
        isCreatingChecklist={isCreatingChecklist}
        newChecklistTitle={newChecklistTitle}
        newItemLabel={newItemLabel}
        onNewChecklistTitleChange={setNewChecklistTitle}
        onNewItemLabelChange={setNewItemLabel}
        onStartCreatingChecklist={() => {
          setIsCreatingChecklist(true)
          setNewChecklistTitle('')
        }}
        onCreateChecklist={handleCreateChecklist}
        onSaveTitle={handleSaveTitle}
        onRemoveTemplate={handleRemoveTemplate}
        onAddItem={handleAddItem}
        onRenameItem={handleRenameItem}
        onRemoveItem={handleRemoveItem}
      />
    ) : (
      <HistoryView
        text={text}
        historyInstances={historyInstances}
        selectedHistoryInstance={selectedHistoryInstance}
        historyUncheckedItems={historyUncheckedItems}
        historyCheckedItems={historyCheckedItems}
        formatStartedLabel={formatStartedLabel}
        onSelectHistoryInstance={handleSelectHistoryInstance}
      />
    )

  return (
    <main className="app-shell">
      <AppMenu
        isOpen={isMenuOpen}
        text={text}
        locale={appState.locale}
        sortedTemplates={sortedTemplates}
        selectedTemplateId={selectedTemplate.id}
        viewMode={viewMode}
        onToggleMenu={() => setIsMenuOpen((open) => !open)}
        onCloseMenu={() => setIsMenuOpen(false)}
        onSelectTemplate={handleSelectTemplate}
        onSelectViewMode={handleSelectViewMode}
        onLocaleChange={(locale) =>
          updateState((state) => ({
            ...state,
            locale,
          }))
        }
      />

      {activeView}
    </main>
  )
}

export default App
