import { computed, shallowRef } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'

const STORAGE_KEY = 'docs-atlas.desktop.preferences.v1'

export type DesktopThemeMode = 'system' | 'light' | 'dark'
export type DesktopAccentId =
  | 'pure-white'
  | 'slate-indigo'
  | 'terracotta'
  | 'plum-orchid'
  | 'walnut-brown'
  | 'atlas-blue'
  | 'ocean-teal'
  | 'forest-green'
  | 'sunset-amber'
  | 'dusty-rose'

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
  { id: 'pure-white', label: '纯净白', hex: '#FFFFFF', rgb: '255, 255, 255' },
  { id: 'slate-indigo', label: '靛云蓝', hex: '#5B6FD6', rgb: '91, 111, 214' },
  { id: 'terracotta', label: '赤陶橘', hex: '#C97059', rgb: '201, 112, 89' },
  { id: 'plum-orchid', label: '晚梅紫', hex: '#9A68B2', rgb: '154, 104, 178' },
  { id: 'walnut-brown', label: '榛木棕', hex: '#9B7653', rgb: '155, 118, 83' },
  { id: 'atlas-blue', label: '星图蓝', hex: '#1F54D9', rgb: '31, 84, 217' },
  { id: 'ocean-teal', label: '海雾青', hex: '#0F8C95', rgb: '15, 140, 149' },
  { id: 'forest-green', label: '森林绿', hex: '#1F8F63', rgb: '31, 143, 99' },
  { id: 'sunset-amber', label: '落日金', hex: '#C28A1A', rgb: '194, 138, 26' },
  { id: 'dusty-rose', label: '雾玫瑰', hex: '#C05F7F', rgb: '192, 95, 127' },
]

const defaultPreferences: DesktopPreferences = {
  themeMode: 'system',
  accentId: 'atlas-blue',
}

const darkTitlebarColors: Record<DesktopAccentId, string> = {
  'atlas-blue': '#1a2d57',
  'ocean-teal': '#163b3f',
  'forest-green': '#19392f',
  'sunset-amber': '#46361b',
  'dusty-rose': '#472433',
  'slate-indigo': '#2a3154',
  terracotta: '#4a2a23',
  'plum-orchid': '#402c49',
  'walnut-brown': '#3f3025',
  'pure-white': '#2d3138',
}

const preferences = shallowRef<DesktopPreferences>(defaultPreferences)
let hasLoaded = false
let mediaQueryList: MediaQueryList | null = null
let cleanupMediaQueryListener: (() => void) | null = null

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

  bindSystemThemeListener()
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
  const resolvedTheme = value.themeMode === 'system' ? getSystemTheme() : value.themeMode

  root.dataset.themeMode = value.themeMode
  root.dataset.theme = resolvedTheme
  root.dataset.themeAccent = accent.id
  root.style.setProperty('color-scheme', resolvedTheme)

  void syncNativeWindowChrome(resolveTitlebarColor(accent.id, resolvedTheme))
}

function isThemeMode(value: unknown): value is DesktopThemeMode {
  return value === 'system' || value === 'light' || value === 'dark'
}

function isAccentId(value: unknown): value is DesktopAccentId {
  return accentOptions.some((option) => option.id === value)
}

function bindSystemThemeListener() {
  if (typeof window === 'undefined' || cleanupMediaQueryListener) {
    return
  }

  mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)')
  const handleChange = () => {
    if (preferences.value.themeMode === 'system') {
      applyPreferences(preferences.value)
    }
  }

  mediaQueryList.addEventListener('change', handleChange)
  cleanupMediaQueryListener = () => {
    mediaQueryList?.removeEventListener('change', handleChange)
  }
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTitlebarColor(accentId: DesktopAccentId, theme: 'light' | 'dark') {
  if (theme === 'dark') {
    return darkTitlebarColors[accentId]
  }

  return accentOptions.find((option) => option.id === accentId)?.hex ?? '#1F54D9'
}

async function syncNativeWindowChrome(color: string) {
  if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
    return
  }

  try {
    await getCurrentWindow().setBackgroundColor(color)
  } catch {
    // Ignore native window sync failures and keep the webview theme active.
  }
}
