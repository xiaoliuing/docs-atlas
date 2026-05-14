import { shallowRef } from 'vue'

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'docs-atlas-theme'
const theme = shallowRef<ThemeMode>('light')

let initialized = false
let hasStoredPreference = false
let cleanupSystemListener: (() => void) | null = null

export function useTheme() {
  function initializeTheme() {
    if (initialized || typeof window === 'undefined') {
      return
    }

    initialized = true

    const savedTheme = window.localStorage.getItem(STORAGE_KEY)
    hasStoredPreference = savedTheme === 'light' || savedTheme === 'dark'

    if (hasStoredPreference) {
      applyTheme(savedTheme as ThemeMode)
    } else {
      applyTheme(getSystemTheme())
    }

    bindSystemThemeListener()
  }

  function toggleTheme() {
    const nextTheme: ThemeMode = theme.value === 'dark' ? 'light' : 'dark'
    hasStoredPreference = true
    window.localStorage.setItem(STORAGE_KEY, nextTheme)
    applyTheme(nextTheme)
  }

  return {
    initializeTheme,
    theme,
    toggleTheme,
  }
}

function bindSystemThemeListener() {
  if (cleanupSystemListener || typeof window === 'undefined') {
    return
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const listener = (event: MediaQueryListEvent) => {
    if (!hasStoredPreference) {
      applyTheme(event.matches ? 'dark' : 'light')
    }
  }

  mediaQuery.addEventListener('change', listener)
  cleanupSystemListener = () => {
    mediaQuery.removeEventListener('change', listener)
  }
}

function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(nextTheme: ThemeMode) {
  theme.value = nextTheme

  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.dataset.theme = nextTheme
  document.documentElement.style.colorScheme = nextTheme
}
