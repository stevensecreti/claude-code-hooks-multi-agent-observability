import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './test/setup'
import { makeEvent, makeThemeInput } from './test/fixtures'
import { createApp } from './app'

const app = createApp()

beforeAll(async () => {
  await setupTestDatabase()
})

afterAll(async () => {
  await teardownTestDatabase()
})

beforeEach(async () => {
  await clearTestDatabase()
})

// ─── Helper ────────────────────────────────────────────────────

async function postEvent(event = makeEvent()) {
  const res = await app.request('/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  })
  return res
}

async function postTheme(theme = makeThemeInput()) {
  const res = await app.request('/api/themes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(theme),
  })
  return res
}

// ─── Health & Root ─────────────────────────────────────────────

describe('GET /health', () => {
  it('returns 200 with ok status when DB is connected', async () => {
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.mongodb).toBe('connected')
    expect(body).toHaveProperty('uptime')
  })
})

describe('GET /', () => {
  it('returns text response "Multi-Agent Observability Server"', async () => {
    const res = await app.request('/')
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toBe('Multi-Agent Observability Server')
  })
})

// ─── Events ────────────────────────────────────────────────────

describe('POST /events', () => {
  it('returns saved event with id for valid event data', async () => {
    const res = await postEvent()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('id')
    expect(body.source_app).toBe('test-app')
    expect(body.session_id).toBe('test-session-001')
    expect(body.hook_event_type).toBe('PreToolUse')
  })

  it('returns 400 for missing required fields', async () => {
    const res = await app.request('/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: 'x', hook_event_type: 'y', payload: {} }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  it('returns 400 for invalid JSON body', async () => {
    const res = await app.request('/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })
})

describe('GET /events/filter-options', () => {
  it('returns filter options object with source_apps, session_ids, hook_event_types', async () => {
    const res = await app.request('/events/filter-options')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('source_apps')
    expect(body).toHaveProperty('session_ids')
    expect(body).toHaveProperty('hook_event_types')
    expect(Array.isArray(body.source_apps)).toBe(true)
    expect(Array.isArray(body.session_ids)).toBe(true)
    expect(Array.isArray(body.hook_event_types)).toBe(true)
  })
})

describe('GET /events/recent', () => {
  it('returns array of events', async () => {
    await postEvent()
    const res = await app.request('/events/recent')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThanOrEqual(1)
  })

  it('respects limit query parameter', async () => {
    await postEvent(makeEvent({ session_id: 'session-a' }))
    await postEvent(makeEvent({ session_id: 'session-b' }))
    await postEvent(makeEvent({ session_id: 'session-c' }))

    const res = await app.request('/events/recent?limit=2')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.length).toBe(2)
  })

  it('returns empty array when no events', async () => {
    const res = await app.request('/events/recent')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })
})

// ─── Chart Data ────────────────────────────────────────────────

describe('GET /api/chart-data', () => {
  it('returns chart data with range and dataPoints', async () => {
    const res = await app.request('/api/chart-data')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('range')
    expect(body).toHaveProperty('dataPoints')
    expect(Array.isArray(body.dataPoints)).toBe(true)
  })

  it('uses default range when none specified', async () => {
    const res = await app.request('/api/chart-data')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.range).toBe('1m')
  })

  it('accepts range query parameter', async () => {
    const res = await app.request('/api/chart-data?range=5m')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.range).toBe('5m')
  })
})

// ─── HITL Response ─────────────────────────────────────────────

describe('POST /events/:id/respond', () => {
  it('returns updated event for valid HITL response', async () => {
    const createRes = await postEvent()
    const created = await createRes.json()

    const res = await app.request(`/events/${created.id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hookEvent: {}, response: 'approved' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('id')
  })

  it('returns 400 for invalid hex ObjectId', async () => {
    const res = await app.request('/events/abc/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hookEvent: {}, response: 'approved' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid event ID')
  })

  it('returns 404 for non-existent event', async () => {
    const res = await app.request('/events/aaaaaaaaaaaaaaaaaaaaaaaa/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hookEvent: {}, response: 'approved' }),
    })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Event not found')
  })
})

// ─── Themes: Create ────────────────────────────────────────────

describe('POST /api/themes', () => {
  it('returns 201 for valid theme creation', async () => {
    const res = await postTheme()
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveProperty('id')
    expect(body.data.name).toBe('test-theme')
  })

  it('returns 400 for invalid theme data (missing name)', async () => {
    const res = await postTheme({ displayName: 'No Name' })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })
})

// ─── Themes: Search ────────────────────────────────────────────

describe('GET /api/themes', () => {
  it('returns list of public themes', async () => {
    await postTheme()
    const res = await app.request('/api/themes')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('supports query parameter for search', async () => {
    await postTheme()
    const res = await app.request('/api/themes?query=test')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

// ─── Themes: Get by ID ────────────────────────────────────────

describe('GET /api/themes/:id', () => {
  it('returns 200 for existing theme', async () => {
    const createRes = await postTheme()
    const created = await createRes.json()
    const themeId = created.data.id

    const res = await app.request(`/api/themes/${themeId}`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe(themeId)
  })

  it('returns 404 for non-existent theme', async () => {
    const res = await app.request('/api/themes/nonexistent-id-12345')
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe('Theme not found')
  })
})

// ─── Themes: Update ────────────────────────────────────────────

describe('PUT /api/themes/:id', () => {
  it('returns 200 for valid update', async () => {
    const createRes = await postTheme()
    const created = await createRes.json()
    const themeId = created.data.id

    const res = await app.request(`/api/themes/${themeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeThemeInput({ displayName: 'Updated Theme' })),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 400 for non-existent theme', async () => {
    const res = await app.request('/api/themes/nonexistent-id-12345', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeThemeInput({ displayName: 'Nope' })),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe('Theme not found')
  })

  it('returns 400 for invalid body', async () => {
    const createRes = await postTheme()
    const created = await createRes.json()
    const themeId = created.data.id

    const res = await app.request(`/api/themes/${themeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })
})

// ─── Themes: Delete ────────────────────────────────────────────

describe('DELETE /api/themes/:id', () => {
  it('returns 200 for successful deletion', async () => {
    const createRes = await postTheme(makeThemeInput({ authorId: 'user-1' }))
    const created = await createRes.json()
    const themeId = created.data.id

    const res = await app.request(`/api/themes/${themeId}?authorId=user-1`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 404 for non-existent theme', async () => {
    const res = await app.request('/api/themes/nonexistent-id-12345?authorId=user-1', {
      method: 'DELETE',
    })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toContain('not found')
  })

  it('returns 403 for unauthorized deletion', async () => {
    const createRes = await postTheme(makeThemeInput({ authorId: 'user-1' }))
    const created = await createRes.json()
    const themeId = created.data.id

    const res = await app.request(`/api/themes/${themeId}?authorId=user-2`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toContain('Unauthorized')
  })
})

// ─── Themes: Export ────────────────────────────────────────────

describe('GET /api/themes/:id/export', () => {
  it('returns 200 with exported theme data and Content-Disposition header', async () => {
    const createRes = await postTheme()
    const created = await createRes.json()
    const themeId = created.data.id

    const res = await app.request(`/api/themes/${themeId}/export`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('version')
    expect(body).toHaveProperty('theme')
    expect(body).toHaveProperty('exportedAt')
    expect(res.headers.get('Content-Disposition')).toContain('attachment')
  })

  it('returns 404 for non-existent theme', async () => {
    const res = await app.request('/api/themes/nonexistent-id-12345/export')
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toContain('not found')
  })
})

// ─── Themes: Import ────────────────────────────────────────────

describe('POST /api/themes/import', () => {
  it('returns 201 for valid import data', async () => {
    const importData = {
      version: '1.0.0',
      theme: {
        name: 'imported-theme',
        displayName: 'Imported Theme',
        description: 'An imported theme',
        colors: makeThemeInput().colors,
        tags: ['imported'],
      },
    }

    const res = await app.request('/api/themes/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(importData),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveProperty('id')
  })

  it('returns 400 for missing theme in import data', async () => {
    const res = await app.request('/api/themes/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: '1.0.0' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })
})

// ─── Themes: Stats ─────────────────────────────────────────────

describe('GET /api/themes/stats', () => {
  it('returns stats object with theme counts', async () => {
    const res = await app.request('/api/themes/stats')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveProperty('totalThemes')
    expect(body.data).toHaveProperty('publicThemes')
    expect(body.data).toHaveProperty('privateThemes')
    expect(body.data).toHaveProperty('totalDownloads')
    expect(body.data).toHaveProperty('averageRating')
  })
})
