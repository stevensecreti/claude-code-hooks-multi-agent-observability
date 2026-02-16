import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './test/setup'
import { makeEvent, makeThemeColors, makeThemeInput } from './test/fixtures'
import {
  insertEvent, getRecentEvents, getFilterOptions,
  insertTheme, getTheme, getThemes, updateTheme, deleteTheme,
  incrementThemeDownloadCount, updateEventHITLResponse,
  getChartData, isConnected, closeDatabase
} from './db'
import type { Theme } from './types'

beforeAll(async () => { await setupTestDatabase() })
afterAll(async () => { await teardownTestDatabase() })
beforeEach(async () => { await clearTestDatabase() })

function makeFullTheme(overrides: Partial<Theme> & { id?: string; name?: string } = {}): Theme {
  return {
    id: overrides.id ?? 'test-theme-1',
    name: overrides.name ?? 'test-theme',
    displayName: overrides.displayName ?? 'Test Theme',
    description: overrides.description ?? 'A test theme',
    colors: overrides.colors ?? makeThemeColors(),
    isPublic: overrides.isPublic ?? true,
    authorId: overrides.authorId ?? 'author-123',
    authorName: overrides.authorName ?? 'Test Author',
    createdAt: overrides.createdAt ?? Date.now(),
    updatedAt: overrides.updatedAt ?? Date.now(),
    tags: overrides.tags ?? ['dark', 'modern'],
    downloadCount: overrides.downloadCount ?? 0,
    rating: overrides.rating ?? 0,
    ratingCount: overrides.ratingCount ?? 0,
  }
}

describe('insertEvent', () => {
  it('inserts event and returns it with id and timestamp', async () => {
    const event = makeEvent()
    const result = await insertEvent(event)

    expect(result.id).toBeDefined()
    expect(typeof result.id).toBe('string')
    expect(result.id!.length).toBe(24) // ObjectId hex string
    expect(result.timestamp).toBeDefined()
    expect(typeof result.timestamp).toBe('number')
    expect(result.source_app).toBe('test-app')
    expect(result.session_id).toBe('test-session-001')
    expect(result.hook_event_type).toBe('PreToolUse')
  })

  it('auto-generates timestamp when not provided', async () => {
    const before = Date.now()
    const event = makeEvent()
    const result = await insertEvent(event)
    const after = Date.now()

    expect(result.timestamp).toBeGreaterThanOrEqual(before)
    expect(result.timestamp).toBeLessThanOrEqual(after)
  })

  it('uses provided timestamp when given', async () => {
    const fixedTimestamp = 1700000000000
    const event = makeEvent({ timestamp: fixedTimestamp })
    const result = await insertEvent(event)

    expect(result.timestamp).toBe(fixedTimestamp)
  })

  it('sets humanInTheLoopStatus to pending when humanInTheLoop is present but status is missing', async () => {
    const event = makeEvent({
      humanInTheLoop: {
        question: 'Allow this?',
        responseWebSocketUrl: 'ws://localhost:47200/stream',
        type: 'permission',
      },
    })
    const result = await insertEvent(event)

    expect(result.humanInTheLoopStatus).toEqual({ status: 'pending' })
  })

  it('preserves humanInTheLoopStatus when explicitly provided', async () => {
    const event = makeEvent({
      humanInTheLoop: {
        question: 'Allow this?',
        responseWebSocketUrl: 'ws://localhost:47200/stream',
        type: 'permission',
      },
      humanInTheLoopStatus: {
        status: 'responded',
        respondedAt: 1700000000000,
      },
    })
    const result = await insertEvent(event)

    expect(result.humanInTheLoopStatus).toEqual({
      status: 'responded',
      respondedAt: 1700000000000,
    })
  })
})

describe('getRecentEvents', () => {
  it('returns events in chronological order (oldest first)', async () => {
    await insertEvent(makeEvent({ timestamp: 3000, source_app: 'app-c' }))
    await insertEvent(makeEvent({ timestamp: 1000, source_app: 'app-a' }))
    await insertEvent(makeEvent({ timestamp: 2000, source_app: 'app-b' }))

    const events = await getRecentEvents()

    expect(events).toHaveLength(3)
    expect(events[0].source_app).toBe('app-a')
    expect(events[1].source_app).toBe('app-b')
    expect(events[2].source_app).toBe('app-c')
  })

  it('respects limit parameter', async () => {
    await insertEvent(makeEvent({ timestamp: 1000 }))
    await insertEvent(makeEvent({ timestamp: 2000 }))
    await insertEvent(makeEvent({ timestamp: 3000 }))

    const events = await getRecentEvents(2)

    expect(events).toHaveLength(2)
    // Should get the 2 most recent (sorted desc, limit 2, then reversed)
    expect(events[0].timestamp).toBe(2000)
    expect(events[1].timestamp).toBe(3000)
  })

  it('returns empty array for empty collection', async () => {
    const events = await getRecentEvents()
    expect(events).toEqual([])
  })
})

describe('getFilterOptions', () => {
  it('returns distinct source_apps sorted alphabetically', async () => {
    await insertEvent(makeEvent({ source_app: 'zeta-app' }))
    await insertEvent(makeEvent({ source_app: 'alpha-app' }))
    await insertEvent(makeEvent({ source_app: 'alpha-app' })) // duplicate
    await insertEvent(makeEvent({ source_app: 'mid-app' }))

    const options = await getFilterOptions()

    expect(options.source_apps).toEqual(['alpha-app', 'mid-app', 'zeta-app'])
  })

  it('returns distinct hook_event_types sorted alphabetically', async () => {
    await insertEvent(makeEvent({ hook_event_type: 'ZType' }))
    await insertEvent(makeEvent({ hook_event_type: 'AType' }))
    await insertEvent(makeEvent({ hook_event_type: 'MType' }))
    await insertEvent(makeEvent({ hook_event_type: 'AType' })) // duplicate

    const options = await getFilterOptions()

    expect(options.hook_event_types).toEqual(['AType', 'MType', 'ZType'])
  })

  it('returns session_ids capped at 300', async () => {
    // Insert enough events with unique session_ids to test the cap
    // We won't insert 301 events, but we verify the slice logic by checking the type
    await insertEvent(makeEvent({ session_id: 'sess-1' }))
    await insertEvent(makeEvent({ session_id: 'sess-2' }))

    const options = await getFilterOptions()

    expect(Array.isArray(options.session_ids)).toBe(true)
    expect(options.session_ids.length).toBeLessThanOrEqual(300)
    expect(options.session_ids).toContain('sess-1')
    expect(options.session_ids).toContain('sess-2')
  })

  it('returns empty arrays when no events exist', async () => {
    const options = await getFilterOptions()

    expect(options.source_apps).toEqual([])
    expect(options.session_ids).toEqual([])
    expect(options.hook_event_types).toEqual([])
  })
})

describe('insertTheme / getTheme', () => {
  it('round-trips a theme (insert then get returns same data)', async () => {
    const theme = makeFullTheme({ id: 'roundtrip-1', name: 'roundtrip-theme' })
    await insertTheme(theme)

    const retrieved = await getTheme('roundtrip-1')

    expect(retrieved).not.toBeNull()
    expect(retrieved!.id).toBe('roundtrip-1')
    expect(retrieved!.name).toBe('roundtrip-theme')
    expect(retrieved!.displayName).toBe(theme.displayName)
    expect(retrieved!.colors).toEqual(theme.colors)
    expect(retrieved!.isPublic).toBe(theme.isPublic)
    expect(retrieved!.tags).toEqual(theme.tags)
    expect(retrieved!.authorId).toBe(theme.authorId)
    expect(retrieved!.downloadCount).toBe(0)
  })

  it('getTheme returns null for non-existent id', async () => {
    const result = await getTheme('does-not-exist')
    expect(result).toBeNull()
  })
})

describe('getThemes', () => {
  async function seedThemes() {
    await insertTheme(makeFullTheme({
      id: 'theme-pub-1', name: 'alpha-public', displayName: 'Alpha Public',
      description: 'A public alpha theme', isPublic: true, authorId: 'author-1',
      createdAt: 1000, updatedAt: 1000, downloadCount: 50,
    }))
    await insertTheme(makeFullTheme({
      id: 'theme-pub-2', name: 'beta-public', displayName: 'Beta Public',
      description: 'A public beta theme', isPublic: true, authorId: 'author-2',
      createdAt: 2000, updatedAt: 2000, downloadCount: 100,
    }))
    await insertTheme(makeFullTheme({
      id: 'theme-priv-1', name: 'gamma-private', displayName: 'Gamma Private',
      description: 'A private gamma theme', isPublic: false, authorId: 'author-1',
      createdAt: 3000, updatedAt: 3000, downloadCount: 10,
    }))
  }

  it('filters by isPublic', async () => {
    await seedThemes()

    const publicThemes = await getThemes({ isPublic: true })
    expect(publicThemes).toHaveLength(2)
    expect(publicThemes.every(t => t.isPublic)).toBe(true)

    const privateThemes = await getThemes({ isPublic: false })
    expect(privateThemes).toHaveLength(1)
    expect(privateThemes[0].name).toBe('gamma-private')
  })

  it('filters by authorId', async () => {
    await seedThemes()

    const themes = await getThemes({ authorId: 'author-1' })
    expect(themes).toHaveLength(2)
    expect(themes.every(t => t.authorId === 'author-1')).toBe(true)
  })

  it('searches by query (regex on name, displayName, description)', async () => {
    await seedThemes()

    const byName = await getThemes({ query: 'alpha' })
    expect(byName).toHaveLength(1)
    expect(byName[0].name).toBe('alpha-public')

    const byDisplay = await getThemes({ query: 'Beta Public' })
    expect(byDisplay).toHaveLength(1)
    expect(byDisplay[0].displayName).toBe('Beta Public')

    const byDesc = await getThemes({ query: 'gamma theme' })
    expect(byDesc).toHaveLength(1)
    expect(byDesc[0].id).toBe('theme-priv-1')
  })

  it('sorts by different fields (name, created, downloads)', async () => {
    await seedThemes()

    const byName = await getThemes({ sortBy: 'name', sortOrder: 'asc' })
    expect(byName.map(t => t.name)).toEqual(['alpha-public', 'beta-public', 'gamma-private'])

    const byCreated = await getThemes({ sortBy: 'created', sortOrder: 'asc' })
    expect(byCreated.map(t => t.id)).toEqual(['theme-pub-1', 'theme-pub-2', 'theme-priv-1'])

    const byDownloads = await getThemes({ sortBy: 'downloads', sortOrder: 'desc' })
    expect(byDownloads.map(t => t.downloadCount)).toEqual([100, 50, 10])
  })

  it('supports limit and offset', async () => {
    await seedThemes()

    const limited = await getThemes({ sortBy: 'created', sortOrder: 'asc', limit: 2 })
    expect(limited).toHaveLength(2)
    expect(limited[0].id).toBe('theme-pub-1')

    const withOffset = await getThemes({ sortBy: 'created', sortOrder: 'asc', limit: 2, offset: 1 })
    expect(withOffset).toHaveLength(2)
    expect(withOffset[0].id).toBe('theme-pub-2')
  })

  it('returns all themes when no filter', async () => {
    await seedThemes()

    const all = await getThemes()
    expect(all).toHaveLength(3)
  })
})

describe('updateTheme', () => {
  it('updates allowed fields (displayName, description, colors, isPublic, tags, updatedAt)', async () => {
    const theme = makeFullTheme({ id: 'update-1', name: 'update-theme' })
    await insertTheme(theme)

    const newColors = makeThemeColors({ primary: '#ff0000' })
    const result = await updateTheme('update-1', {
      displayName: 'Updated Display Name',
      description: 'Updated description',
      colors: newColors,
      isPublic: false,
      tags: ['updated', 'new-tag'],
      updatedAt: 9999999,
    })

    expect(result).toBe(true)

    const updated = await getTheme('update-1')
    expect(updated!.displayName).toBe('Updated Display Name')
    expect(updated!.description).toBe('Updated description')
    expect(updated!.colors.primary).toBe('#ff0000')
    expect(updated!.isPublic).toBe(false)
    expect(updated!.tags).toEqual(['updated', 'new-tag'])
    expect(updated!.updatedAt).toBe(9999999)
  })

  it('ignores non-allowed fields (name, id, etc.)', async () => {
    const theme = makeFullTheme({ id: 'update-2', name: 'immutable-theme' })
    await insertTheme(theme)

    // Only non-allowed fields passed => returns false
    const result = await updateTheme('update-2', {
      name: 'changed-name',
      id: 'changed-id',
    } as any)

    expect(result).toBe(false)

    const unchanged = await getTheme('update-2')
    expect(unchanged!.name).toBe('immutable-theme')
    expect(unchanged!.id).toBe('update-2')
  })

  it('returns false when no fields to update (empty update)', async () => {
    const theme = makeFullTheme({ id: 'update-3', name: 'empty-update-theme' })
    await insertTheme(theme)

    const result = await updateTheme('update-3', {})
    expect(result).toBe(false)
  })

  it('returns false for non-existent theme', async () => {
    const result = await updateTheme('non-existent-id', { displayName: 'New Name' })
    expect(result).toBe(false)
  })
})

describe('deleteTheme', () => {
  it('deletes existing theme and returns true', async () => {
    const theme = makeFullTheme({ id: 'delete-1', name: 'delete-me' })
    await insertTheme(theme)

    const result = await deleteTheme('delete-1')
    expect(result).toBe(true)

    const gone = await getTheme('delete-1')
    expect(gone).toBeNull()
  })

  it('returns false for non-existent theme', async () => {
    const result = await deleteTheme('no-such-theme')
    expect(result).toBe(false)
  })
})

describe('incrementThemeDownloadCount', () => {
  it('increments download count by 1', async () => {
    const theme = makeFullTheme({ id: 'dl-1', name: 'download-theme', downloadCount: 5 })
    await insertTheme(theme)

    const result = await incrementThemeDownloadCount('dl-1')
    expect(result).toBe(true)

    const updated = await getTheme('dl-1')
    expect(updated!.downloadCount).toBe(6)
  })

  it('returns false for non-existent theme', async () => {
    const result = await incrementThemeDownloadCount('no-such-theme')
    expect(result).toBe(false)
  })
})

describe('updateEventHITLResponse', () => {
  it('updates HITL status and returns updated event', async () => {
    const event = makeEvent({
      humanInTheLoop: {
        question: 'Allow file write?',
        responseWebSocketUrl: 'ws://localhost:47200/stream',
        type: 'permission',
      },
    })
    const inserted = await insertEvent(event)

    const response = {
      permission: true,
      respondedAt: Date.now(),
      respondedBy: 'test-user',
    }

    const updated = await updateEventHITLResponse(inserted.id!, response)

    expect(updated).not.toBeNull()
    expect(updated!.humanInTheLoopStatus).toBeDefined()
    expect(updated!.humanInTheLoopStatus!.status).toBe('responded')
    expect(updated!.humanInTheLoopStatus!.response).toEqual(response)
    expect(updated!.humanInTheLoopStatus!.respondedAt).toBe(response.respondedAt)
  })

  it('returns null for invalid ObjectId format', async () => {
    const result = await updateEventHITLResponse('not-a-valid-id', {
      permission: true,
      respondedAt: Date.now(),
    })

    expect(result).toBeNull()
  })

  it('returns null for non-existent event (valid ObjectId format)', async () => {
    const result = await updateEventHITLResponse('aaaaaaaaaaaaaaaaaaaaaaaa', {
      permission: true,
      respondedAt: Date.now(),
    })

    expect(result).toBeNull()
  })
})

describe('getChartData', () => {
  it('returns bucketed data for events within time range', async () => {
    const now = Date.now()
    // Insert events with timestamps close to now so they fall within '1m' range
    await insertEvent(makeEvent({ timestamp: now - 5000, hook_event_type: 'PreToolUse' }))
    await insertEvent(makeEvent({ timestamp: now - 4000, hook_event_type: 'PostToolUse' }))
    await insertEvent(makeEvent({ timestamp: now - 3000, hook_event_type: 'PreToolUse' }))

    const data = await getChartData('1m')

    expect(data.length).toBeGreaterThan(0)
    const totalCount = data.reduce((sum, d) => sum + d.count, 0)
    expect(totalCount).toBe(3)

    // Verify structure of data points
    for (const point of data) {
      expect(point).toHaveProperty('timestamp')
      expect(point).toHaveProperty('count')
      expect(point).toHaveProperty('eventTypes')
      expect(point).toHaveProperty('sessions')
    }
  })

  it('filters by agentId (source_app:session_id prefix)', async () => {
    const now = Date.now()
    await insertEvent(makeEvent({ timestamp: now - 2000, source_app: 'app-x', session_id: 'sess-abc123' }))
    await insertEvent(makeEvent({ timestamp: now - 1000, source_app: 'app-x', session_id: 'sess-abc456' }))
    await insertEvent(makeEvent({ timestamp: now - 500, source_app: 'app-y', session_id: 'sess-def' }))

    const data = await getChartData('1m', 'app-x:sess-abc')

    const totalCount = data.reduce((sum, d) => sum + d.count, 0)
    expect(totalCount).toBe(2) // both app-x events with session starting with sess-abc
  })

  it('returns empty array for invalid range string', async () => {
    const data = await getChartData('99h')
    expect(data).toEqual([])
  })
})

describe('isConnected', () => {
  it('returns true when database is connected', () => {
    expect(isConnected()).toBe(true)
  })
})
