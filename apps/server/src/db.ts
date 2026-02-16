import { MongoClient, ObjectId } from 'mongodb';
import type { HookEvent, FilterOptions, Theme, ThemeSearchQuery, ChartDataPoint } from './types';
import { TIME_RANGE_CONFIG } from './types';

let client: MongoClient;
let db: ReturnType<MongoClient['db']>;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:47217/observability';

export async function initDatabase(): Promise<void> {
  const maxRetries = 10;
  const retryDelay = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      client = new MongoClient(MONGODB_URI);
      await client.connect();
      db = client.db();

      // Create indexes for events
      const events = db.collection('events');
      await events.createIndex({ source_app: 1 });
      await events.createIndex({ session_id: 1 });
      await events.createIndex({ hook_event_type: 1 });
      await events.createIndex({ timestamp: -1 });
      await events.createIndex({ source_app: 1, session_id: 1, timestamp: -1 });

      // Create indexes for themes
      const themes = db.collection('themes');
      await themes.createIndex({ name: 1 }, { unique: true });
      await themes.createIndex({ isPublic: 1 });
      await themes.createIndex({ createdAt: -1 });

      // Create indexes for theme_shares
      const themeShares = db.collection('theme_shares');
      await themeShares.createIndex({ shareToken: 1 }, { unique: true });

      // Create indexes for theme_ratings
      const themeRatings = db.collection('theme_ratings');
      await themeRatings.createIndex({ themeId: 1 });
      await themeRatings.createIndex({ themeId: 1, userId: 1 }, { unique: true });

      console.log('Connected to MongoDB');
      return;
    } catch (error) {
      console.error(`MongoDB connection attempt ${attempt}/${maxRetries} failed:`, error);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        throw new Error(`Failed to connect to MongoDB after ${maxRetries} attempts`);
      }
    }
  }
}

export async function insertEvent(event: HookEvent): Promise<HookEvent> {
  const timestamp = event.timestamp || Date.now();

  let humanInTheLoopStatus = event.humanInTheLoopStatus;
  if (event.humanInTheLoop && !humanInTheLoopStatus) {
    humanInTheLoopStatus = { status: 'pending' };
  }

  const doc = {
    source_app: event.source_app,
    session_id: event.session_id,
    hook_event_type: event.hook_event_type,
    payload: event.payload,
    chat: event.chat || null,
    summary: event.summary || null,
    timestamp,
    humanInTheLoop: event.humanInTheLoop || null,
    humanInTheLoopStatus: humanInTheLoopStatus || null,
    model_name: event.model_name || null,
  };

  const result = await db.collection('events').insertOne(doc);

  return {
    ...event,
    id: result.insertedId.toHexString(),
    timestamp,
    humanInTheLoopStatus,
  };
}

export async function getFilterOptions(): Promise<FilterOptions> {
  const events = db.collection('events');

  const [sourceApps, sessionIds, hookEventTypes] = await Promise.all([
    events.distinct('source_app'),
    events.distinct('session_id'),
    events.distinct('hook_event_type'),
  ]);

  return {
    source_apps: sourceApps.sort(),
    session_ids: sessionIds.slice(0, 300),
    hook_event_types: hookEventTypes.sort(),
  };
}

export async function getRecentEvents(limit: number = 300): Promise<HookEvent[]> {
  const rows = await db.collection('events')
    .find()
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();

  return rows.map(row => ({
    id: row._id.toHexString(),
    source_app: row.source_app,
    session_id: row.session_id,
    hook_event_type: row.hook_event_type,
    payload: row.payload,
    chat: row.chat || undefined,
    summary: row.summary || undefined,
    timestamp: row.timestamp,
    humanInTheLoop: row.humanInTheLoop || undefined,
    humanInTheLoopStatus: row.humanInTheLoopStatus || undefined,
    model_name: row.model_name || undefined,
  })).reverse();
}

// Theme database functions
export async function insertTheme(theme: Theme): Promise<Theme> {
  await db.collection('themes').insertOne({
    _id: theme.id,
    name: theme.name,
    displayName: theme.displayName,
    description: theme.description || null,
    colors: theme.colors,
    isPublic: theme.isPublic,
    authorId: theme.authorId || null,
    authorName: theme.authorName || null,
    createdAt: theme.createdAt,
    updatedAt: theme.updatedAt,
    tags: theme.tags,
    downloadCount: theme.downloadCount || 0,
    rating: theme.rating || 0,
    ratingCount: theme.ratingCount || 0,
  } as any);

  return theme;
}

export async function updateTheme(id: string, updates: Partial<Theme>): Promise<boolean> {
  const allowedFields = ['displayName', 'description', 'colors', 'isPublic', 'updatedAt', 'tags'];
  const setDoc: Record<string, any> = {};

  for (const key of Object.keys(updates)) {
    if (allowedFields.includes(key)) {
      setDoc[key] = updates[key as keyof Theme];
    }
  }

  if (Object.keys(setDoc).length === 0) return false;

  const result = await db.collection('themes').updateOne(
    { _id: id as any },
    { $set: setDoc }
  );

  return result.modifiedCount > 0;
}

export async function getTheme(id: string): Promise<Theme | null> {
  const row = await db.collection('themes').findOne({ _id: id as any });

  if (!row) return null;

  return {
    id: String(row._id),
    name: row.name,
    displayName: row.displayName,
    description: row.description,
    colors: row.colors,
    isPublic: row.isPublic,
    authorId: row.authorId,
    authorName: row.authorName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    tags: row.tags || [],
    downloadCount: row.downloadCount,
    rating: row.rating,
    ratingCount: row.ratingCount,
  };
}

export async function getThemes(query: ThemeSearchQuery = {}): Promise<Theme[]> {
  const filter: Record<string, any> = {};

  if (query.isPublic !== undefined) {
    filter.isPublic = query.isPublic;
  }

  if (query.authorId) {
    filter.authorId = query.authorId;
  }

  if (query.query) {
    const searchRegex = { $regex: query.query, $options: 'i' };
    filter.$or = [
      { name: searchRegex },
      { displayName: searchRegex },
      { description: searchRegex },
    ];
  }

  const sortColumn: Record<string, string> = {
    name: 'name',
    created: 'createdAt',
    updated: 'updatedAt',
    downloads: 'downloadCount',
    rating: 'rating',
  };

  const sortField = sortColumn[query.sortBy || 'created'] || 'createdAt';
  const sortOrder = (query.sortOrder || 'desc') === 'asc' ? 1 : -1;

  let cursor = db.collection('themes')
    .find(filter)
    .sort({ [sortField]: sortOrder });

  if (query.limit) {
    cursor = cursor.limit(query.limit);
    if (query.offset) {
      cursor = cursor.skip(query.offset);
    }
  }

  const rows = await cursor.toArray();

  return rows.map(row => ({
    id: String(row._id),
    name: row.name,
    displayName: row.displayName,
    description: row.description,
    colors: row.colors,
    isPublic: row.isPublic,
    authorId: row.authorId,
    authorName: row.authorName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    tags: row.tags || [],
    downloadCount: row.downloadCount,
    rating: row.rating,
    ratingCount: row.ratingCount,
  }));
}

export async function deleteTheme(id: string): Promise<boolean> {
  const result = await db.collection('themes').deleteOne({ _id: id as any });
  return result.deletedCount > 0;
}

export async function incrementThemeDownloadCount(id: string): Promise<boolean> {
  const result = await db.collection('themes').updateOne(
    { _id: id as any },
    { $inc: { downloadCount: 1 } }
  );
  return result.modifiedCount > 0;
}

// HITL helper functions
export async function updateEventHITLResponse(id: string, response: any): Promise<HookEvent | null> {
  const status = {
    status: 'responded',
    respondedAt: response.respondedAt,
    response,
  };

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return null;
  }

  await db.collection('events').updateOne(
    { _id: objectId },
    { $set: { humanInTheLoopStatus: status } }
  );

  const row = await db.collection('events').findOne({ _id: objectId });

  if (!row) return null;

  return {
    id: row._id.toHexString(),
    source_app: row.source_app,
    session_id: row.session_id,
    hook_event_type: row.hook_event_type,
    payload: row.payload,
    chat: row.chat || undefined,
    summary: row.summary || undefined,
    timestamp: row.timestamp,
    humanInTheLoop: row.humanInTheLoop || undefined,
    humanInTheLoopStatus: row.humanInTheLoopStatus || undefined,
    model_name: row.model_name || undefined,
  };
}

// Chart data aggregation
export async function getChartData(range: string, agentId?: string): Promise<ChartDataPoint[]> {
  const config = TIME_RANGE_CONFIG[range as keyof typeof TIME_RANGE_CONFIG];
  if (!config) return [];

  const cutoff = Date.now() - config.duration;
  const bucketSize = config.bucketSize;

  const matchStage: Record<string, any> = { timestamp: { $gte: cutoff } };

  if (agentId) {
    const parts = agentId.split(':');
    if (parts.length === 2) {
      matchStage.source_app = parts[0];
      matchStage.session_id = { $regex: `^${parts[1]}` };
    }
  }

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: { $subtract: ['$timestamp', { $mod: ['$timestamp', bucketSize] }] },
        count: { $sum: 1 },
        eventTypes: { $push: '$hook_event_type' },
        toolInfos: {
          $push: {
            eventType: '$hook_event_type',
            toolName: '$payload.tool_name',
          },
        },
        sessionIds: { $push: '$session_id' },
      },
    },
    { $sort: { _id: 1 as const } },
  ];

  const results = await db.collection('events').aggregate(pipeline).toArray();

  // Post-process arrays into frequency maps
  return results.map(row => {
    const eventTypes: Record<string, number> = {};
    for (const et of row.eventTypes) {
      eventTypes[et] = (eventTypes[et] || 0) + 1;
    }

    const toolEvents: Record<string, number> = {};
    for (const info of row.toolInfos) {
      if (info.toolName) {
        const key = `${info.eventType}:${info.toolName}`;
        toolEvents[key] = (toolEvents[key] || 0) + 1;
      }
    }

    const sessions: Record<string, number> = {};
    for (const sid of row.sessionIds) {
      sessions[sid] = (sessions[sid] || 0) + 1;
    }

    return {
      timestamp: row._id,
      count: row.count,
      eventTypes,
      toolEvents,
      sessions,
    };
  });
}

export function isConnected(): boolean {
  try {
    // MongoClient.topology is internal but the only sync way to check connectivity
    const c = client as { topology?: { isConnected(): boolean } } | undefined;
    return c !== undefined && c.topology !== undefined && c.topology.isConnected();
  } catch {
    return false;
  }
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
}
