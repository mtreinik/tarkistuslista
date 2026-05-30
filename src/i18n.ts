export type Locale = 'en' | 'fi' | 'sw'

export const localeOptions: Locale[] = ['en', 'fi', 'sw']
export const localeLabels: Record<Locale, string> = {
  en: 'English',
  fi: 'Finnish (suomi)',
  sw: 'Swedish (svenska)',
}

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'fi' || value === 'sw'
}

export function toIntlLocale(locale: Locale) {
  switch (locale) {
    case 'fi':
      return 'fi-FI'
    case 'sw':
      return 'sv-SE'
    default:
      return 'en'
  }
}

export type Messages = {
  appBadge: string
  templateEditor: string
  history: string
  historyEmpty: string
  languageLabel: string
  navigationLabel: string
  openMenu: string
  closeMenu: string
  checklistTabsLabel: string
  checklistTitleLabel: string
  checklistItemsLabel: string
  checklistOrderingLabel: string
  checklistTitlePlaceholder: string
  checklistOrderingByLastWord: string
  checklistOrderingByFullLabel: string
  newChecklist: string
  removeChecklist: string
  createChecklist: string
  saveTitle: string
  addTemplateItem: string
  addTemplateItemPlaceholder: string
  addItem: string
  removeItem: string
  giveTitleFirst: string
  noTemplateItems: string
  everythingChecked: string
  nothingCheckedYet: string
  everythingWasChecked: string
  nothingWasChecked: string
  started: (value: string) => string
  newChecklistOf: (title: string) => string
  removeChecklistConfirm: (title: string) => string
  historySummary: (unchecked: number, checked: number) => string
  toCheckTitle: (count: number, total: number) => string
  checkedTitle: (count: number, total: number) => string
  editItemAria: (label: string) => string
}

export const messages: Record<Locale, Messages> = {
  en: {
    appBadge: 'Checklist',
    templateEditor: 'Template editor',
    history: 'History',
    historyEmpty: 'Start a new checklist to begin building history.',
    languageLabel: 'Language',
    navigationLabel: 'App navigation',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    checklistTabsLabel: 'Checklist titles',
    checklistTitleLabel: 'Checklist title',
    checklistItemsLabel: 'Checklist items',
    checklistOrderingLabel: 'Sort unchecked items by',
    checklistTitlePlaceholder: 'Checklist title',
    checklistOrderingByLastWord: 'Last word',
    checklistOrderingByFullLabel: 'Whole item name',
    newChecklist: 'New checklist',
    removeChecklist: 'Remove checklist',
    createChecklist: 'Create checklist',
    saveTitle: 'Save title',
    addTemplateItem: 'Add template item',
    addTemplateItemPlaceholder: 'Toothbrush',
    addItem: 'Add item',
    removeItem: 'Remove',
    giveTitleFirst: 'Give the checklist a title before adding or editing items.',
    noTemplateItems: 'No template items yet. Add the first one below.',
    everythingChecked: 'Everything is checked.',
    nothingCheckedYet: 'Nothing checked yet.',
    everythingWasChecked: 'Everything was checked.',
    nothingWasChecked: 'Nothing was checked.',
    started: (value) => `Started ${value}`,
    newChecklistOf: (title) => `New ${title}`,
    removeChecklistConfirm: (title) =>
      `Are you sure you want to remove checklist '${title}'?`,
    historySummary: (unchecked, checked) =>
      `${unchecked} unchecked / ${checked} checked`,
    toCheckTitle: (count, total) => `${count} / ${total} to check`,
    checkedTitle: (count, total) => `${count} / ${total} checked`,
    editItemAria: (label) => `Edit ${label}`,
  },
  fi: {
    appBadge: 'Tarkistuslista',
    templateEditor: 'Muokkaa pohjaa',
    history: 'Historia',
    historyEmpty: 'Aloita uusi tarkistuslista, niin historiaa alkaa kertyä.',
    languageLabel: 'Kieli',
    navigationLabel: 'Sovelluksen valikko',
    openMenu: 'Avaa valikko',
    closeMenu: 'Sulje valikko',
    checklistTabsLabel: 'Tarkistuslistat',
    checklistTitleLabel: 'Tarkistuslistan nimi',
    checklistItemsLabel: 'Tarkistuslistan kohdat',
    checklistOrderingLabel: 'Järjestä tarkistamattomat kohdat',
    checklistTitlePlaceholder: 'Tarkistuslistan nimi',
    checklistOrderingByLastWord: 'Viimeisen sanan mukaan',
    checklistOrderingByFullLabel: 'Koko nimen mukaan',
    newChecklist: 'Uusi tarkistuslista',
    removeChecklist: 'Poista tarkistuslista',
    createChecklist: 'Luo tarkistuslista',
    saveTitle: 'Tallenna nimi',
    addTemplateItem: 'Lisää listan kohta',
    addTemplateItemPlaceholder: 'Hammasharja',
    addItem: 'Lisää kohta',
    removeItem: 'Poista',
    giveTitleFirst: 'Anna tarkistuslistalle nimi ennen kohtien lisäämistä tai muokkausta.',
    noTemplateItems: 'Listassa ei vielä ole kohtia. Lisää ensimmäinen kohta alle.',
    everythingChecked: 'Kaikki on tarkistettu.',
    nothingCheckedYet: 'Mitään ei ole vielä tarkistettu.',
    everythingWasChecked: 'Kaikki oli tarkistettu.',
    nothingWasChecked: 'Mitään ei ollut tarkistettu.',
    started: (value) => `Aloitettu ${value}`,
    newChecklistOf: (title) => `Uusi ${title}`,
    removeChecklistConfirm: (title) =>
      `Haluatko varmasti poistaa tarkistuslistan '${title}'?`,
    historySummary: (unchecked, checked) =>
      `${unchecked} tarkistamatta / ${checked} tarkistettu`,
    toCheckTitle: (count, total) => `${count} / ${total} tarkistamatta`,
    checkedTitle: (count, total) => `${count} / ${total} tarkistettu`,
    editItemAria: (label) => `Muokkaa kohtaa ${label}`,
  },
  sw: {
    appBadge: 'Checklista',
    templateEditor: 'Redigera mall',
    history: 'Historik',
    historyEmpty: 'Starta en ny checklista för att börja bygga historik.',
    languageLabel: 'Språk',
    navigationLabel: 'Appnavigering',
    openMenu: 'Öppna meny',
    closeMenu: 'Stäng meny',
    checklistTabsLabel: 'Checklistor',
    checklistTitleLabel: 'Checklistans namn',
    checklistItemsLabel: 'Checklistans punkter',
    checklistOrderingLabel: 'Sortera okontrollerade punkter efter',
    checklistTitlePlaceholder: 'Checklistans namn',
    checklistOrderingByLastWord: 'Sista ordet',
    checklistOrderingByFullLabel: 'Hela namnet',
    newChecklist: 'Ny checklista',
    removeChecklist: 'Ta bort checklista',
    createChecklist: 'Skapa checklista',
    saveTitle: 'Spara namn',
    addTemplateItem: 'Lägg till punkt',
    addTemplateItemPlaceholder: 'Tandborste',
    addItem: 'Lägg till punkt',
    removeItem: 'Ta bort',
    giveTitleFirst:
      'Ge checklistan ett namn innan du lägger till eller redigerar punkter.',
    noTemplateItems: 'Checklistan har inga punkter ännu. Lägg till den första nedan.',
    everythingChecked: 'Allt är kontrollerat.',
    nothingCheckedYet: 'Ingenting är kontrollerat ännu.',
    everythingWasChecked: 'Allt var kontrollerat.',
    nothingWasChecked: 'Ingenting var kontrollerat.',
    started: (value) => `Startad ${value}`,
    newChecklistOf: (title) => `Ny ${title}`,
    removeChecklistConfirm: (title) =>
      `Är du säker på att du vill ta bort checklistan '${title}'?`,
    historySummary: (unchecked, checked) =>
      `${unchecked} okontrollerade / ${checked} kontrollerade`,
    toCheckTitle: (count, total) => `${count} / ${total} att kontrollera`,
    checkedTitle: (count, total) => `${count} / ${total} kontrollerade`,
    editItemAria: (label) => `Redigera ${label}`,
  },
}
