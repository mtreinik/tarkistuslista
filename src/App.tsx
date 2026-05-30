import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { messages, toIntlLocale, type Locale } from './i18n'
import { compareChecklistLabels } from './checklistSorting'
import { AppMenu } from './components/AppMenu'
import { HistoryView } from './views/HistoryView'
import { ChecklistView } from './views/ChecklistView'
import { TemplateEditorView } from './views/TemplateEditorView'
import {
  type AppState,
  type ChecklistInstance,
  type ChecklistInstanceItem,
  type ChecklistOrderingMode,
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

function getUncheckedItems(
  items: ChecklistInstanceItem[],
  orderingMode: ChecklistOrderingMode,
) {
  return items
    .filter((item) => item.checkedOrder === null)
    .sort((left, right) =>
      compareChecklistLabels(left.label, right.label, orderingMode),
    )
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
type ItemRect = {
  top: number
  left: number
  width: number
  height: number
}

type MovingItem = {
  itemId: string
  label: string
  orderBadge: number | null
  targetList: 'unchecked' | 'checked'
  sourceRect: ItemRect
  targetRect: ItemRect | null
}

const ITEM_MOVE_DURATION_MS = 960
const SOURCE_LIST_REORDER_DURATION_MS = 320

function getItemRect(element: HTMLElement): ItemRect {
  const rect = element.getBoundingClientRect()

  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  }
}

function App() {
  const [appState, setAppState] = useState<AppState>(() => loadAppState())
  const [newChecklistTitle, setNewChecklistTitle] = useState('')
  const [newItemLabel, setNewItemLabel] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('checklist')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCreatingChecklist, setIsCreatingChecklist] = useState(false)
  const [movingItems, setMovingItems] = useState<MovingItem[]>([])
  const itemElementRefs = useRef<Map<string, HTMLElement>>(new Map())
  const movingOverlayRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const movingAnimationRefs = useRef<Map<string, Animation>>(new Map())
  const text = messages[appState.locale]

  useEffect(() => {
    saveAppState(appState)
  }, [appState])

  useEffect(() => {
    const animationRefs = movingAnimationRefs.current

    return () => {
      animationRefs.forEach((animation) => animation.cancel())
      animationRefs.clear()
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

  const uncheckedItems = useMemo(
    () =>
      activeInstance
        ? getUncheckedItems(activeInstance.items, activeInstance.orderingMode)
        : [],
    [activeInstance],
  )
  const checkedItems = useMemo(
    () => (activeInstance ? getCheckedItems(activeInstance.items) : []),
    [activeInstance],
  )
  const historyUncheckedItems = useMemo(
    () =>
      selectedHistoryInstance
        ? getUncheckedItems(
            selectedHistoryInstance.items,
            selectedHistoryInstance.orderingMode,
          )
        : [],
    [selectedHistoryInstance],
  )
  const historyCheckedItems = useMemo(
    () =>
      selectedHistoryInstance ? getCheckedItems(selectedHistoryInstance.items) : [],
    [selectedHistoryInstance],
  )

  const hiddenItemIds = useMemo(
    () => movingItems.map((item) => item.itemId),
    [movingItems],
  )
  const uncheckedLayoutAnimationDuration = movingItems.some(
    (item) => item.targetList === 'unchecked',
  )
    ? ITEM_MOVE_DURATION_MS
    : SOURCE_LIST_REORDER_DURATION_MS
  const checkedLayoutAnimationDuration = movingItems.some(
    (item) => item.targetList === 'checked',
  )
    ? ITEM_MOVE_DURATION_MS
    : SOURCE_LIST_REORDER_DURATION_MS

  useLayoutEffect(() => {
    if (!activeInstance) {
      return
    }

    const nextTargetRects = new Map<string, ItemRect>()

    movingItems.forEach((movingItem) => {
      if (movingItem.targetRect !== null) {
        return
      }

      const targetElement = itemElementRefs.current.get(movingItem.itemId)

      if (!targetElement) {
        return
      }

      nextTargetRects.set(movingItem.itemId, getItemRect(targetElement))
    })

    if (nextTargetRects.size === 0) {
      return
    }

    setMovingItems((current) =>
      current.map((movingItem) => {
        const targetRect = nextTargetRects.get(movingItem.itemId)

        return targetRect && movingItem.targetRect === null
          ? {
              ...movingItem,
              targetRect,
            }
          : movingItem
      }),
    )
  }, [activeInstance, checkedItems, movingItems, uncheckedItems])

  useEffect(() => {
    movingItems.forEach((movingItem) => {
      if (
        !movingItem.targetRect ||
        movingAnimationRefs.current.has(movingItem.itemId)
      ) {
        return
      }

      const overlayElement = movingOverlayRefs.current.get(movingItem.itemId)

      if (!overlayElement) {
        return
      }

      const animation = overlayElement.animate(
        [
          {
            top: `${movingItem.sourceRect.top}px`,
            left: `${movingItem.sourceRect.left}px`,
            width: `${movingItem.sourceRect.width}px`,
            height: `${movingItem.sourceRect.height}px`,
          },
          {
            top: `${movingItem.targetRect.top}px`,
            left: `${movingItem.targetRect.left}px`,
            width: `${movingItem.targetRect.width}px`,
            height: `${movingItem.targetRect.height}px`,
          },
        ],
        {
          duration: ITEM_MOVE_DURATION_MS,
          easing: 'ease-out',
          fill: 'forwards',
        },
      )

      movingAnimationRefs.current.set(movingItem.itemId, animation)

      animation.finished
        .then(() => {
          if (movingAnimationRefs.current.get(movingItem.itemId) !== animation) {
            return
          }

          movingAnimationRefs.current.delete(movingItem.itemId)
          movingOverlayRefs.current.delete(movingItem.itemId)
          setMovingItems((current) =>
            current.filter((item) => item.itemId !== movingItem.itemId),
          )
        })
        .catch(() => {})
    })
  }, [movingItems])

  const registerItemElement = (itemId: string, element: HTMLElement | null) => {
    if (element) {
      itemElementRefs.current.set(itemId, element)
      return
    }

    itemElementRefs.current.delete(itemId)
  }

  const registerMovingOverlayElement = (
    itemId: string,
    element: HTMLDivElement | null,
  ) => {
    if (element) {
      movingOverlayRefs.current.set(itemId, element)
      return
    }

    movingOverlayRefs.current.delete(itemId)
  }

  if (!selectedTemplate || !activeInstance) {
    return null
  }

  const toggleItem = (itemId: string) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }

    const targetItem = activeInstance.items.find((item) => item.id === itemId)
    const sourceElement = itemElementRefs.current.get(itemId)

    if (!targetItem || !sourceElement) {
      return
    }

    const targetList = targetItem.checkedOrder === null ? 'checked' : 'unchecked'

    setMovingItems((current) => [
      ...current,
      {
        itemId,
        label: targetItem.label,
        orderBadge:
          targetList === 'checked' ? getCheckedItems(activeInstance.items).length + 1 : null,
        targetList,
        sourceRect: getItemRect(sourceElement),
        targetRect: null,
      },
    ])

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

  const handleSaveOrderingMode = (orderingMode: ChecklistOrderingMode) => {
    if (orderingMode === selectedTemplate.orderingMode) {
      return
    }

    const nextUpdatedAt = new Date().toISOString()

    updateState((state) => ({
      ...state,
      templates: state.templates.map((template) =>
        template.id === selectedTemplate.id
          ? {
              ...template,
              orderingMode,
              updatedAt: nextUpdatedAt,
            }
          : template,
      ),
      instances: updateLatestInstanceForTemplate(
        state.instances,
        selectedTemplate.id,
        (instance) => ({
          ...instance,
          orderingMode,
        }),
      ),
    }))
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
        hiddenItemIds={hiddenItemIds}
        uncheckedLayoutAnimationDuration={uncheckedLayoutAnimationDuration}
        checkedLayoutAnimationDuration={checkedLayoutAnimationDuration}
        onRegisterItemElement={registerItemElement}
        onToggleItem={toggleItem}
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
        onSaveOrderingMode={handleSaveOrderingMode}
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
        selectedTemplateTitle={selectedTemplate.title}
        viewMode={viewMode}
        onToggleMenu={() => setIsMenuOpen((open) => !open)}
        onCloseMenu={() => setIsMenuOpen(false)}
        onStartFreshChecklist={handleStartFreshChecklist}
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
      {movingItems.map((movingItem) => (
        <div
          key={movingItem.itemId}
          ref={(element) => registerMovingOverlayElement(movingItem.itemId, element)}
          className="item-flight"
          style={{
            top: `${movingItem.sourceRect.top}px`,
            left: `${movingItem.sourceRect.left}px`,
            width: `${movingItem.sourceRect.width}px`,
            height: `${movingItem.sourceRect.height}px`,
          }}
        >
          <div className="item-card item-card--flying">
            <span className="item-label">{movingItem.label}</span>
            {movingItem.orderBadge !== null ? (
              <span className="order-badge">{movingItem.orderBadge}</span>
            ) : null}
          </div>
        </div>
      ))}
    </main>
  )
}

export default App
