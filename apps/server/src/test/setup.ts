import { MongoClient } from 'mongodb'
import { initDatabase, closeDatabase } from '../db'

const TEST_URI = process.env.MONGODB_URI || 'mongodb://localhost:47217/observability_test'

export async function setupTestDatabase(): Promise<void> {
  await initDatabase()
}

export async function clearTestDatabase(): Promise<void> {
  const client = new MongoClient(TEST_URI)
  try {
    await client.connect()
    const db = client.db()
    const collections = ['events', 'themes', 'theme_shares', 'theme_ratings']
    for (const name of collections) {
      await db.collection(name).deleteMany({})
    }
  } finally {
    await client.close()
  }
}

export async function teardownTestDatabase(): Promise<void> {
  await closeDatabase()
}
