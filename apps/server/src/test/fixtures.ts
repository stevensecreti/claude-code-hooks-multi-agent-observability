import type { ThemeColors, HookEvent } from '../types'

export function makeThemeColors(overrides: Partial<ThemeColors> = {}): ThemeColors {
  return {
    primary: '#6366f1',
    primaryHover: '#4f46e5',
    primaryLight: '#a5b4fc',
    primaryDark: '#3730a3',
    bgPrimary: '#0f172a',
    bgSecondary: '#1e293b',
    bgTertiary: '#334155',
    bgQuaternary: '#475569',
    textPrimary: '#f8fafc',
    textSecondary: '#cbd5e1',
    textTertiary: '#94a3b8',
    textQuaternary: '#64748b',
    borderPrimary: '#334155',
    borderSecondary: '#1e293b',
    borderTertiary: '#475569',
    accentSuccess: '#22c55e',
    accentWarning: '#f59e0b',
    accentError: '#ef4444',
    accentInfo: '#3b82f6',
    shadow: 'rgba(0,0,0,0.3)',
    shadowLg: 'rgba(0,0,0,0.5)',
    hoverBg: 'rgba(255,255,255,0.05)',
    activeBg: 'rgba(255,255,255,0.1)',
    focusRing: '#6366f1',
    ...overrides,
  }
}

export function makeEvent(overrides: Partial<HookEvent> = {}): HookEvent {
  return {
    source_app: 'test-app',
    session_id: 'test-session-001',
    hook_event_type: 'PreToolUse',
    payload: { tool_name: 'Bash', tool_input: { command: 'echo hello' } },
    ...overrides,
  }
}

export function makeThemeInput(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    name: 'test-theme',
    displayName: 'Test Theme',
    description: 'A test theme',
    colors: makeThemeColors(),
    isPublic: true,
    tags: ['dark', 'modern'],
    authorId: 'author-123',
    authorName: 'Test Author',
    ...overrides,
  }
}
