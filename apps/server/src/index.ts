import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { createNodeWebSocket } from '@hono/node-ws'
import { WebSocket } from 'ws'
import type { WSContext } from 'hono/ws'
import { initDatabase, insertEvent, getFilterOptions, getRecentEvents, updateEventHITLResponse, getChartData, isConnected, closeDatabase } from './db'
import type { HookEvent, HumanInTheLoopResponse } from './types'
import {
  createTheme,
  updateThemeById,
  getThemeById,
  searchThemes,
  deleteThemeById,
  exportThemeById,
  importTheme,
  getThemeStats
} from './theme'

// Initialize database
await initDatabase()

// Hono app + WebSocket setup
const app = new Hono()
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })

// Store WebSocket clients
const wsClients = new Set<WSContext>()

// CORS middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}))

// Helper: broadcast to all WebSocket clients
function broadcast(message: string) {
  wsClients.forEach(client => {
    try {
      client.send(message)
    } catch {
      wsClients.delete(client)
    }
  })
}

// Helper function to send response to agent via WebSocket
async function sendResponseToAgent(
  wsUrl: string,
  response: HumanInTheLoopResponse
): Promise<void> {
  console.log(`[HITL] Connecting to agent WebSocket: ${wsUrl}`)

  return new Promise((resolve, reject) => {
    let ws: WebSocket | null = null
    let isResolved = false

    const cleanup = () => {
      if (ws) {
        try {
          ws.close()
        } catch (e) {
          // Ignore close errors
        }
      }
    }

    try {
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        if (isResolved) return
        console.log('[HITL] WebSocket connection opened, sending response...')

        try {
          ws!.send(JSON.stringify(response))
          console.log('[HITL] Response sent successfully')

          // Wait longer to ensure message fully transmits before closing
          setTimeout(() => {
            cleanup()
            if (!isResolved) {
              isResolved = true
              resolve()
            }
          }, 500)
        } catch (error) {
          console.error('[HITL] Error sending message:', error)
          cleanup()
          if (!isResolved) {
            isResolved = true
            reject(error)
          }
        }
      }

      ws.onerror = (error) => {
        console.error('[HITL] WebSocket error:', error)
        cleanup()
        if (!isResolved) {
          isResolved = true
          reject(error)
        }
      }

      ws.onclose = () => {
        console.log('[HITL] WebSocket connection closed')
      }

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!isResolved) {
          console.error('[HITL] Timeout sending response to agent')
          cleanup()
          isResolved = true
          reject(new Error('Timeout sending response to agent'))
        }
      }, 5000)

    } catch (error) {
      console.error('[HITL] Error creating WebSocket:', error)
      cleanup()
      if (!isResolved) {
        isResolved = true
        reject(error)
      }
    }
  })
}

// ─── Routes ──────────────────────────────────────────────────

// Health check
app.get('/health', (c) => {
  const mongoConnected = isConnected()
  return c.json({
    status: mongoConnected ? 'ok' : 'degraded',
    mongodb: mongoConnected ? 'connected' : 'disconnected',
    uptime: process.uptime(),
  }, mongoConnected ? 200 : 503)
})

// Ingest events
app.post('/events', async (c) => {
  try {
    const event: HookEvent = await c.req.json()

    if (!event.source_app || !event.session_id || !event.hook_event_type || !event.payload) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    const savedEvent = await insertEvent(event)
    broadcast(JSON.stringify({ type: 'event', data: savedEvent }))

    return c.json(savedEvent)
  } catch (error) {
    console.error('Error processing event:', error)
    return c.json({ error: 'Invalid request' }, 400)
  }
})

// Filter options
app.get('/events/filter-options', async (c) => {
  const options = await getFilterOptions()
  return c.json(options)
})

// Recent events
app.get('/events/recent', async (c) => {
  const limit = parseInt(c.req.query('limit') || '300')
  const events = await getRecentEvents(limit)
  return c.json(events)
})

// Chart data
app.get('/api/chart-data', async (c) => {
  const range = c.req.query('range') || '1m'
  const agentId = c.req.query('agentId') || undefined
  const dataPoints = await getChartData(range, agentId)
  return c.json({ range, dataPoints })
})

// HITL response
app.post('/events/:id/respond', async (c) => {
  const id = c.req.param('id')

  // Validate 24-char hex ObjectId
  if (!/^[a-f0-9]{24}$/.test(id)) {
    return c.json({ error: 'Invalid event ID' }, 400)
  }

  try {
    const response: HumanInTheLoopResponse = await c.req.json()
    response.respondedAt = Date.now()

    const updatedEvent = await updateEventHITLResponse(id, response)

    if (!updatedEvent) {
      return c.json({ error: 'Event not found' }, 404)
    }

    // Send response to agent via WebSocket
    if (updatedEvent.humanInTheLoop?.responseWebSocketUrl) {
      try {
        await sendResponseToAgent(
          updatedEvent.humanInTheLoop.responseWebSocketUrl,
          response
        )
      } catch (error) {
        console.error('Failed to send response to agent:', error)
      }
    }

    // Broadcast updated event to all connected clients
    broadcast(JSON.stringify({ type: 'event', data: updatedEvent }))

    return c.json(updatedEvent)
  } catch (error) {
    console.error('Error processing HITL response:', error)
    return c.json({ error: 'Invalid request' }, 400)
  }
})

// ─── Theme Routes ────────────────────────────────────────────
// Note: /stats and /import MUST come before /:id to avoid param capture

// Theme stats
app.get('/api/themes/stats', async (c) => {
  const result = await getThemeStats()
  return c.json(result)
})

// Import theme
app.post('/api/themes/import', async (c) => {
  try {
    const importData = await c.req.json()
    const authorId = c.req.query('authorId')

    const result = await importTheme(importData, authorId || undefined)
    return c.json(result, result.success ? 201 : 400)
  } catch (error) {
    console.error('Error importing theme:', error)
    return c.json({ success: false, error: 'Invalid import data' }, 400)
  }
})

// Create theme
app.post('/api/themes', async (c) => {
  try {
    const themeData = await c.req.json()
    const result = await createTheme(themeData)
    return c.json(result, result.success ? 201 : 400)
  } catch (error) {
    console.error('Error creating theme:', error)
    return c.json({ success: false, error: 'Invalid request body' }, 400)
  }
})

// Search themes
app.get('/api/themes', async (c) => {
  const query = {
    query: c.req.query('query') || undefined,
    isPublic: c.req.query('isPublic') ? c.req.query('isPublic') === 'true' : undefined,
    authorId: c.req.query('authorId') || undefined,
    sortBy: c.req.query('sortBy') as any || undefined,
    sortOrder: c.req.query('sortOrder') as any || undefined,
    limit: c.req.query('limit') ? parseInt(c.req.query('limit')!) : undefined,
    offset: c.req.query('offset') ? parseInt(c.req.query('offset')!) : undefined,
  }

  const result = await searchThemes(query)
  return c.json(result)
})

// Export theme (must come before /:id GET)
app.get('/api/themes/:id/export', async (c) => {
  const id = c.req.param('id')

  const result = await exportThemeById(id)
  if (!result.success) {
    const status = result.error?.includes('not found') ? 404 : 400
    return c.json(result, status)
  }

  return c.json(result.data, 200, {
    'Content-Disposition': `attachment; filename="${result.data.theme.name}.json"`
  })
})

// Get theme by ID
app.get('/api/themes/:id', async (c) => {
  const id = c.req.param('id')
  if (!id) {
    return c.json({ success: false, error: 'Theme ID is required' }, 400)
  }

  const result = await getThemeById(id)
  return c.json(result, result.success ? 200 : 404)
})

// Update theme
app.put('/api/themes/:id', async (c) => {
  const id = c.req.param('id')
  if (!id) {
    return c.json({ success: false, error: 'Theme ID is required' }, 400)
  }

  try {
    const updates = await c.req.json()
    const result = await updateThemeById(id, updates)
    return c.json(result, result.success ? 200 : 400)
  } catch (error) {
    console.error('Error updating theme:', error)
    return c.json({ success: false, error: 'Invalid request body' }, 400)
  }
})

// Delete theme
app.delete('/api/themes/:id', async (c) => {
  const id = c.req.param('id')
  if (!id) {
    return c.json({ success: false, error: 'Theme ID is required' }, 400)
  }

  const authorId = c.req.query('authorId')
  const result = await deleteThemeById(id, authorId || undefined)

  const status = result.success ? 200 : (result.error?.includes('not found') ? 404 : 403)
  return c.json(result, status)
})

// ─── WebSocket ───────────────────────────────────────────────

app.get('/stream', upgradeWebSocket((c) => ({
  async onOpen(evt, ws) {
    console.log('WebSocket client connected')
    wsClients.add(ws)

    // Send recent events on connection
    const events = await getRecentEvents(300)
    ws.send(JSON.stringify({ type: 'initial', data: events }))
  },

  onMessage(evt, ws) {
    console.log('Received message:', evt.data)
  },

  onClose(evt, ws) {
    console.log('WebSocket client disconnected')
    wsClients.delete(ws)
  },

  onError(evt, ws) {
    console.error('WebSocket error:', evt)
    wsClients.delete(ws)
  },
})))

// Default route
app.get('/', (c) => {
  return c.text('Multi-Agent Observability Server')
})

// ─── Start Server ────────────────────────────────────────────

const port = parseInt(process.env.SERVER_PORT || '47200')

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`)
  console.log(`WebSocket endpoint: ws://localhost:${info.port}/stream`)
  console.log(`POST events to: http://localhost:${info.port}/events`)
})

injectWebSocket(server)

// Graceful shutdown
const shutdown = async () => {
  console.log('\nShutting down gracefully...')
  await closeDatabase()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
