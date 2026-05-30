import type { ChecklistOrderingMode, ChecklistTemplateItem } from './storage'

const checklistItemCollator = new Intl.Collator('sv-SE', {
  sensitivity: 'base',
})

function getLastWord(label: string) {
  const words = label.trim().split(/\s+/)
  return words.at(-1) ?? label.trim()
}

export function compareChecklistLabels(
  leftLabel: string,
  rightLabel: string,
  orderingMode: ChecklistOrderingMode,
) {
  const leftPrimary =
    orderingMode === 'last-word' ? getLastWord(leftLabel) : leftLabel.trim()
  const rightPrimary =
    orderingMode === 'last-word' ? getLastWord(rightLabel) : rightLabel.trim()
  const primaryComparison = checklistItemCollator.compare(
    leftPrimary,
    rightPrimary,
  )

  if (primaryComparison !== 0) {
    return primaryComparison
  }

  return checklistItemCollator.compare(leftLabel.trim(), rightLabel.trim())
}

export function sortTemplateItems(
  items: ChecklistTemplateItem[],
  orderingMode: ChecklistOrderingMode,
) {
  return [...items].sort((left, right) =>
    compareChecklistLabels(left.label, right.label, orderingMode),
  )
}
