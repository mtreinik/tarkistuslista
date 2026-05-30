import { useEffect, useRef, type FormEvent } from 'react'
import type { Messages } from '../i18n'
import type { ChecklistTemplate } from '../storage'

type TemplateEditorViewProps = {
  text: Messages
  templates: ChecklistTemplate[]
  selectedTemplate: ChecklistTemplate
  isCreatingChecklist: boolean
  newChecklistTitle: string
  newItemLabel: string
  onNewChecklistTitleChange: (value: string) => void
  onNewItemLabelChange: (value: string) => void
  onStartCreatingChecklist: () => void
  onCreateChecklist: (title: string) => void
  onSaveTitle: (title: string) => void
  onRemoveTemplate: () => void
  onAddItem: (label: string) => void
  onRenameItem: (itemId: string, nextLabel: string) => void
  onRemoveItem: (itemId: string) => void
}

export function TemplateEditorView({
  text,
  templates,
  selectedTemplate,
  isCreatingChecklist,
  newChecklistTitle,
  newItemLabel,
  onNewChecklistTitleChange,
  onNewItemLabelChange,
  onStartCreatingChecklist,
  onCreateChecklist,
  onSaveTitle,
  onRemoveTemplate,
  onAddItem,
  onRenameItem,
  onRemoveItem,
}: TemplateEditorViewProps) {
  const titleInputRef = useRef<HTMLInputElement | null>(null)
  const addItemInputRef = useRef<HTMLInputElement | null>(null)
  const previousTemplateIdRef = useRef(selectedTemplate.id)
  const previousItemCountRef = useRef(selectedTemplate.items.length)
  const duplicateNewChecklistTitle = templates.some(
    (template) =>
      template.title.toLowerCase() === newChecklistTitle.trim().toLowerCase(),
  )

  useEffect(() => {
    if (isCreatingChecklist) {
      titleInputRef.current?.focus()
    }
  }, [isCreatingChecklist])

  useEffect(() => {
    if (previousTemplateIdRef.current !== selectedTemplate.id) {
      previousTemplateIdRef.current = selectedTemplate.id
      previousItemCountRef.current = selectedTemplate.items.length
      return
    }

    if (
      !isCreatingChecklist &&
      selectedTemplate.items.length > previousItemCountRef.current
    ) {
      window.requestAnimationFrame(() => {
        addItemInputRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        })
        addItemInputRef.current?.focus()
      })
    }

    previousItemCountRef.current = selectedTemplate.items.length
  }, [isCreatingChecklist, selectedTemplate.id, selectedTemplate.items.length])

  const handleTitleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isCreatingChecklist) {
      const title = newChecklistTitle.trim()

      if (!title || duplicateNewChecklistTitle) {
        return
      }

      onCreateChecklist(title)
      return
    }

    const formData = new FormData(event.currentTarget)
    const nextTitle = String(formData.get('title') ?? '').trim()
    const titleExists = templates.some(
      (template) =>
        template.id !== selectedTemplate.id &&
        template.title.toLowerCase() === nextTitle.toLowerCase(),
    )

    if (!nextTitle || titleExists || nextTitle === selectedTemplate.title) {
      return
    }

    onSaveTitle(nextTitle)
  }

  const handleAddItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const label = newItemLabel.trim()

    if (!label) {
      return
    }

    onAddItem(label)
  }

  const handleRemoveTemplate = () => {
    if (templates.length <= 1) {
      return
    }

    const confirmed = window.confirm(
      text.removeChecklistConfirm(selectedTemplate.title),
    )

    if (!confirmed) {
      return
    }

    onRemoveTemplate()
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

    onRenameItem(itemId, trimmedLabel)
  }

  return (
    <section className="panel template-panel">
      <div className="panel-header">
        <div>
          <h2>{text.templateEditor}</h2>
        </div>
        <div className="template-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onStartCreatingChecklist}
          >
            {text.newChecklist}
          </button>
          <button
            type="button"
            className="danger-button"
            onClick={handleRemoveTemplate}
            disabled={isCreatingChecklist || templates.length <= 1}
          >
            {text.removeChecklist}
          </button>
        </div>
      </div>
      <form
        key={isCreatingChecklist ? 'new-checklist' : selectedTemplate.id}
        className="inline-form"
        onSubmit={handleTitleSubmit}
      >
        <label className="field field--wide">
          <span>{text.checklistTitleLabel}</span>
          {isCreatingChecklist ? (
            <input
              ref={titleInputRef}
              type="text"
              value={newChecklistTitle}
              onChange={(event) => onNewChecklistTitleChange(event.target.value)}
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
                onClick={() => onRemoveItem(item.id)}
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
              ref={addItemInputRef}
              type="text"
              value={newItemLabel}
              onChange={(event) => onNewItemLabelChange(event.target.value)}
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
  )
}
