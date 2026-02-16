import { serve } from '@hono/node-server'
import { createNodeWebSocket } from '@hono/node-ws'
import type { WSContext } from 'hono/ws'
import { initDatabase, getRecentEvents, closeDatabase } from './db'
import { createApp, wsClients, broadcast } from './app'

// Initialize database
await initDatabase()

// Create app and WebSocket setup
const app = createApp()
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })

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
