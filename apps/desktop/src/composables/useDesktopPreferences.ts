import { computed, shallowRef } from 'vue'

const STORAGE_KEY = 'docs-atlas.desktop.preferences.v1'

export type DesktopThemeMode = 'system' | 'light' | 'dark'
export type DesktopAccentId = 'atlas' | 'forest' | 'amber' | 'rose' | 'violet'

export type DesktopAccentOption = {
  id: DesktopAccentId
  label: string
  hex: string
  rgb: string
}

type DesktopPreferences = {
  themeMode: DesktopThemeMode
  accentId: DesktopAccentId
}

const accentOptions: DesktopAccentOption[] = [
  { id: 'atlas', label: 'Atlas Blue', hex: '#1F54D9', rgb: '31, 84, 217' },
  { id: 'forest', label: 'Forest Green', hex: '#1F7A5A', rgb: '31, 122, 90' },
  { id: 'amber', label: 'Amber Gold', hex: '#C98512', rgb: '201, 133, 18' },
  { id: 'rose', label: 'Rose Coral', hex: '#C75A72', rgb: '199, 90, 114' },
  { id: 'violet', label: 'Violet Ink', hex: '#6D5BD0', rgb: '109, 91, 208' },
]

const defaultPreferences: DesktopPreferences = {
  themeMode: 'system',
  accentId: 'atlas',
}

const preferences = shallowRef<DesktopPreferences>(defaultPreferences)
let hasLoaded = false

export function useDesktopPreferences() {
  ensurePreferencesLoaded()

  const currentAccent = computed(
    () => accentOptions.find((option) => option.id === preferences.value.accentId) ?? accentOptions[0],
  )

  function setThemeMode(themeMode: DesktopThemeMode) {
    preferences.value = {
      ...preferences.value,
      themeMode,
    }
    persistPreferences()
    applyPreferences(preferences.value)
  }

  function setAccent(accentId: DesktopAccentId) {
    preferences.value = {
      ...preferences.value,
      accentId,
    }
    persistPreferences()
    applyPreferences(preferences.value)
  }

  return {
    accentOptions,
    currentAccent,
    preferences,
    setAccent,
    setThemeMode,
  }
}

function ensurePreferencesLoaded() {
  if (hasLoaded) {
    return
  }

  hasLoaded = true

  if (typeof window === 'undefined') {
    return
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY)
    if (rawValue) {
      const parsed = JSON.parse(rawValue) as Partial<DesktopPreferences>
      preferences.value = {
        themeMode: isThemeMode(parsed.themeMode) ? parsed.themeMode : defaultPreferences.themeMode,
        accentId: isAccentId(parsed.accentId) ? parsed.accentId : defaultPreferences.accentId,
      }
    }
  } catch {
    preferences.value = defaultPreferences
  }

  applyPreferences(preferences.value)
}

function persistPreferences() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences.value))
}

function applyPreferences(value: DesktopPreferences) {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement
  const accent = accentOptions.find((option) => option.id === value.accentId) ?? accentOptions[0]

  if (value.themeMode === 'system') {
    root.removeAttribute('data-theme-mode')
    root.style.setProperty('color-scheme', 'light dark')
  } else {
    root.dataset.themeMode = value.themeMode
    root.style.setProperty('color-scheme', value.themeMode)
  }

  root.dataset.themeAccent = accent.id
  root.style.setProperty('--desktop-accent', accent.hex)
  root.style.setProperty('--desktop-accent-rgb', accent.rgb)
  root.style.setProperty('--color-accent', accent.hex)
  root.style.setProperty('--color-accent-rgb', accent.rgb)
  root.style.setProperty('--color-accent-deep', accent.hex)
}

function isThemeMode(value: unknown): value is DesktopThemeMode {
  return value === 'system' || value === 'light' || value === 'dark'
}

function isAccentId(value: unknown): value is DesktopAccentId {
  return accentOptions.some((option) => option.id === value)
}
