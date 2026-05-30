export type ChecklistTemplateItem = {
  id: string
  label: string
}

export type ChecklistTemplate = {
  id: string
  title: string
  items: ChecklistTemplateItem[]
  createdAt: string
  updatedAt: string
}

export type ChecklistInstanceItem = {
  id: string
  label: string
  checkedOrder: number | null
}

export type ChecklistInstance = {
  id: string
  templateId: string
  title: string
  startedAt: string
  items: ChecklistInstanceItem[]
}

export type AppState = {
  templates: ChecklistTemplate[]
  instances: ChecklistInstance[]
  selectedTemplateId: string
  selectedHistoryInstanceId: string | null
}

const STORAGE_KEY = 'tarkistuslista-state-v1'

function createId() {
  return crypto.randomUUID()
}

function createTimestamp() {
  return new Date().toISOString()
}

export function createChecklistTemplate(
  title: string,
  labels: string[],
): ChecklistTemplate {
  const now = createTimestamp()

  return {
    id: createId(),
    title,
    items: labels.map((label) => ({
      id: createId(),
      label,
    })),
    createdAt: now,
    updatedAt: now,
  }
}

export function createChecklistInstance(
  template: ChecklistTemplate,
): ChecklistInstance {
  return {
    id: createId(),
    templateId: template.id,
    title: template.title,
    startedAt: createTimestamp(),
    items: template.items.map((item) => ({
      id: item.id,
      label: item.label,
      checkedOrder: null,
    })),
  }
}

export function createDefaultState(): AppState {
  const starterTemplate = createChecklistTemplate('Travel checklist', [
    'Backpack',
    'Boarding pass',
    'Charger',
    'Headphones',
    'Keys',
    'Passport',
    'Phone',
    'Wallet',
  ])
  const starterInstance = createChecklistInstance(starterTemplate)

  return {
    templates: [starterTemplate],
    instances: [starterInstance],
    selectedTemplateId: starterTemplate.id,
    selectedHistoryInstanceId: null,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isTemplateItem(value: unknown): value is ChecklistTemplateItem {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.label === 'string'
  )
}

function isTemplate(value: unknown): value is ChecklistTemplate {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    Array.isArray(value.items) &&
    value.items.every(isTemplateItem)
  )
}

function isInstanceItem(value: unknown): value is ChecklistInstanceItem {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.label === 'string' &&
    (typeof value.checkedOrder === 'number' || value.checkedOrder === null)
  )
}

function isInstance(value: unknown): value is ChecklistInstance {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.templateId === 'string' &&
    typeof value.title === 'string' &&
    typeof value.startedAt === 'string' &&
    Array.isArray(value.items) &&
    value.items.every(isInstanceItem)
  )
}

function isAppState(value: unknown): value is AppState {
  return (
    isRecord(value) &&
    Array.isArray(value.templates) &&
    value.templates.every(isTemplate) &&
    Array.isArray(value.instances) &&
    value.instances.every(isInstance) &&
    typeof value.selectedTemplateId === 'string' &&
    (typeof value.selectedHistoryInstanceId === 'string' ||
      value.selectedHistoryInstanceId === null)
  )
}

export function normalizeAppState(state: AppState): AppState {
  if (state.templates.length === 0) {
    return createDefaultState()
  }

  const selectedTemplateId = state.templates.some(
    (template) => template.id === state.selectedTemplateId,
  )
    ? state.selectedTemplateId
    : state.templates[0].id

  const selectedHistoryInstanceId = state.instances.some(
    (instance) => instance.id === state.selectedHistoryInstanceId,
  )
    ? state.selectedHistoryInstanceId
    : null

  return {
    ...state,
    selectedTemplateId,
    selectedHistoryInstanceId,
  }
}

export function loadAppState(): AppState {
  const fallbackState = createDefaultState()
  const savedState = window.localStorage.getItem(STORAGE_KEY)

  if (!savedState) {
    return fallbackState
  }

  try {
    const parsedState = JSON.parse(savedState) as unknown

    if (!isAppState(parsedState)) {
      console.error('Saved checklist data has an invalid shape. Resetting app.')
      return fallbackState
    }

    return normalizeAppState(parsedState)
  } catch (error) {
    console.error('Failed to parse saved checklist data. Resetting app.', error)
    return fallbackState
  }
}

export function saveAppState(state: AppState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function getLatestInstanceForTemplate(
  instances: ChecklistInstance[],
  templateId: string,
): ChecklistInstance | undefined {
  return [...instances]
    .filter((instance) => instance.templateId === templateId)
    .sort(
      (left, right) =>
        new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime(),
    )[0]
}
