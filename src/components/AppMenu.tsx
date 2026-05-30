import { useEffect } from 'react'
import {
  localeLabels,
  localeOptions,
  type Locale,
  type Messages,
} from '../i18n'
import type { ChecklistTemplate } from '../storage'

type ViewMode = 'checklist' | 'template' | 'history'

type AppMenuProps = {
  isOpen: boolean
  text: Messages
  locale: Locale
  sortedTemplates: ChecklistTemplate[]
  selectedTemplateId: string
  viewMode: ViewMode
  onToggleMenu: () => void
  onCloseMenu: () => void
  onSelectTemplate: (templateId: string) => void
  onSelectViewMode: (mode: ViewMode) => void
  onLocaleChange: (locale: Locale) => void
}

export function AppMenu({
  isOpen,
  text,
  locale,
  sortedTemplates,
  selectedTemplateId,
  viewMode,
  onToggleMenu,
  onCloseMenu,
  onSelectTemplate,
  onSelectViewMode,
  onLocaleChange,
}: AppMenuProps) {
  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseMenu()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onCloseMenu])

  return (
    <>
      <button
        type="button"
        className={isOpen ? 'menu-toggle menu-toggle--open' : 'menu-toggle'}
        aria-expanded={isOpen}
        aria-controls="app-menu-drawer"
        aria-label={isOpen ? text.closeMenu : text.openMenu}
        onClick={onToggleMenu}
      >
        <span className="menu-toggle__line" aria-hidden="true" />
        <span className="menu-toggle__line" aria-hidden="true" />
        <span className="menu-toggle__line" aria-hidden="true" />
      </button>

      {isOpen ? (
        <>
          <button
            type="button"
            className="menu-backdrop"
            aria-label={text.closeMenu}
            onClick={onCloseMenu}
          />
          <aside className="menu-drawer" id="app-menu-drawer">
            <nav className="menu-nav" aria-label={text.navigationLabel}>
              <div className="menu-section">
                <p className="menu-section__title">{text.checklistTabsLabel}</p>
                <div className="menu-list">
                  {sortedTemplates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      className={
                        template.id === selectedTemplateId &&
                        viewMode === 'checklist'
                          ? 'chip-button chip-button--active menu-button'
                          : 'chip-button menu-button'
                      }
                      onClick={() => onSelectTemplate(template.id)}
                    >
                      {template.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="menu-separator" aria-hidden="true" />

              <div className="menu-section">
                <div className="menu-list">
                  <button
                    type="button"
                    className={
                      viewMode === 'history'
                        ? 'chip-button chip-button--active menu-button'
                        : 'chip-button menu-button'
                    }
                    onClick={() => onSelectViewMode('history')}
                  >
                    {text.history}
                  </button>
                  <button
                    type="button"
                    className={
                      viewMode === 'template'
                        ? 'chip-button chip-button--active menu-button'
                        : 'chip-button menu-button'
                    }
                    onClick={() => onSelectViewMode('template')}
                  >
                    {text.templateEditor}
                  </button>
                </div>
              </div>

              <label className="menu-language-picker">
                <span>{text.languageLabel}</span>
                <select
                  value={locale}
                  aria-label={text.languageLabel}
                  onChange={(event) => onLocaleChange(event.target.value as Locale)}
                >
                  {localeOptions.map((option) => (
                    <option key={option} value={option}>
                      {localeLabels[option]}
                    </option>
                  ))}
                </select>
              </label>
            </nav>
          </aside>
        </>
      ) : null}
    </>
  )
}
