import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './test/setup'
import { makeThemeColors, makeThemeInput } from './test/fixtures'
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

beforeAll(async () => { await setupTestDatabase() })
afterAll(async () => { await teardownTestDatabase() })
beforeEach(async () => { await clearTestDatabase() })

describe('createTheme', () => {
  it('creates a valid theme and returns success with data', async () => {
    const input = makeThemeInput()
    const result = await createTheme(input)

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data!.name).toBe('test-theme')
    expect(result.data!.displayName).toBe('Test Theme')
    expect(result.data!.colors.primary).toBe('#6366f1')
    expect(result.data!.id).toBeDefined()
  })

  it('returns validation error for missing name', async () => {
    const input = makeThemeInput({ name: '' })
    const result = await createTheme(input)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Validation failed')
    expect(result.validationErrors).toBeDefined()
    expect(result.validationErrors!.some(e => e.field === 'name' && e.code === 'REQUIRED')).toBe(true)
  })

  it('returns validation error for invalid name format (all invalid chars become empty after sanitization)', async () => {
    // sanitizeTheme strips invalid chars: '!!!' becomes '' which triggers REQUIRED
    const input = makeThemeInput({ name: '!!!' })
    const result = await createTheme(input)

    expect(result.success).toBe(false)
    expect(result.validationErrors!.some(e => e.field === 'name' && e.code === 'REQUIRED')).toBe(true)
  })

  it('sanitizes uppercase name and strips invalid chars before validation', async () => {
    // 'My Theme!' is sanitized to 'mytheme' which is valid
    const input = makeThemeInput({ name: 'My Theme!' })
    const result = await createTheme(input)

    expect(result.success).toBe(true)
    expect(result.data!.name).toBe('mytheme')
  })

  it('returns validation error for missing displayName', async () => {
    const input = makeThemeInput({ displayName: '' })
    const result = await createTheme(input)

    expect(result.success).toBe(false)
    expect(result.validationErrors!.some(e => e.field === 'displayName' && e.code === 'REQUIRED')).toBe(true)
  })

  it('returns validation error for missing colors', async () => {
    // sanitizeTheme converts undefined colors to {}, so the 'colors' REQUIRED check
    // won't fire. Instead, every individual required color triggers a REQUIRED error.
    const input = makeThemeInput({ colors: undefined })
    const result = await createTheme(input)

    expect(result.success).toBe(false)
    expect(result.validationErrors).toBeDefined()
    expect(result.validationErrors!.some(e => e.field === 'colors.primary' && e.code === 'REQUIRED')).toBe(true)
    expect(result.validationErrors!.some(e => e.field === 'colors.bgPrimary' && e.code === 'REQUIRED')).toBe(true)
  })

  it('returns validation error for missing individual required color', async () => {
    const colors = makeThemeColors()
    delete (colors as any).primary
    const input = makeThemeInput({ colors })
    const result = await createTheme(input)

    expect(result.success).toBe(false)
    expect(result.validationErrors!.some(e => e.field === 'colors.primary' && e.code === 'REQUIRED')).toBe(true)
  })

  it('returns validation error for invalid color format', async () => {
    const colors = makeThemeColors({ primary: 'not-a-color' })
    const input = makeThemeInput({ colors })
    const result = await createTheme(input)

    expect(result.success).toBe(false)
    expect(result.validationErrors!.some(e => e.field === 'colors.primary' && e.code === 'INVALID_COLOR')).toBe(true)
  })

  it('sanitizes invalid tags by filtering them out', async () => {
    // sanitizeTheme filters out empty strings and non-strings from tags
    // so the validation error is never reached through createTheme
    const input = makeThemeInput({ tags: ['valid', '', 'also-valid'] })
    const result = await createTheme(input)

    expect(result.success).toBe(true)
    expect(result.data!.tags).toEqual(['valid', 'also-valid'])
  })

  it('sanitizes name to lowercase with invalid chars stripped', async () => {
    const input = makeThemeInput({ name: 'My-Theme_123' })
    const result = await createTheme(input)

    expect(result.success).toBe(true)
    expect(result.data!.name).toBe('my-theme_123')
  })

  it('sanitizes displayName by trimming whitespace', async () => {
    const input = makeThemeInput({ name: 'trimmed-theme', displayName: '  Trimmed Theme  ' })
    const result = await createTheme(input)

    expect(result.success).toBe(true)
    expect(result.data!.displayName).toBe('Trimmed Theme')
  })

  it('detects duplicate theme name', async () => {
    const input = makeThemeInput()
    const first = await createTheme(input)
    expect(first.success).toBe(true)

    const duplicate = await createTheme(input)
    expect(duplicate.success).toBe(false)
    expect(duplicate.error).toBe('Theme name already exists')
    expect(duplicate.validationErrors!.some(e => e.code === 'DUPLICATE')).toBe(true)
  })

  it('sets createdAt and updatedAt timestamps', async () => {
    const before = Date.now()
    const result = await createTheme(makeThemeInput())
    const after = Date.now()

    expect(result.success).toBe(true)
    expect(result.data!.createdAt).toBeGreaterThanOrEqual(before)
    expect(result.data!.createdAt).toBeLessThanOrEqual(after)
    expect(result.data!.updatedAt).toBeGreaterThanOrEqual(before)
    expect(result.data!.updatedAt).toBeLessThanOrEqual(after)
  })

  it('sets downloadCount, rating, ratingCount to 0', async () => {
    const result = await createTheme(makeThemeInput())

    expect(result.success).toBe(true)
    expect(result.data!.downloadCount).toBe(0)
    expect(result.data!.rating).toBe(0)
    expect(result.data!.ratingCount).toBe(0)
  })
})

describe('updateThemeById', () => {
  it('updates theme successfully and returns updated data', async () => {
    const created = await createTheme(makeThemeInput())
    expect(created.success).toBe(true)
    const id = created.data!.id

    // Must include colors in update because sanitizeTheme defaults missing colors to {},
    // which overwrites existing colors in the merged validation check
    const result = await updateThemeById(id, {
      displayName: 'Updated Theme',
      colors: makeThemeColors(),
    })

    expect(result.success).toBe(true)
    expect(result.data!.displayName).toBe('Updated Theme')
  })

  it('returns error for non-existent theme', async () => {
    const result = await updateThemeById('nonexistent-id-123', { displayName: 'Nope' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Theme not found')
  })

  it('does not allow changing the name', async () => {
    const created = await createTheme(makeThemeInput())
    expect(created.success).toBe(true)
    const id = created.data!.id

    const result = await updateThemeById(id, {
      name: 'new-name',
      displayName: 'Still Updated',
      colors: makeThemeColors(),
    })

    expect(result.success).toBe(true)
    expect(result.data!.name).toBe('test-theme')
  })

  it('auto-sets updatedAt on update', async () => {
    const created = await createTheme(makeThemeInput())
    expect(created.success).toBe(true)
    const id = created.data!.id
    const originalUpdatedAt = created.data!.updatedAt

    // Small delay to ensure timestamp differs
    await new Promise(resolve => setTimeout(resolve, 10))

    const result = await updateThemeById(id, {
      displayName: 'Time Check',
      colors: makeThemeColors(),
    })

    expect(result.success).toBe(true)
    expect(result.data!.updatedAt).toBeGreaterThan(originalUpdatedAt)
  })

  it('validates merged theme (invalid colors caught)', async () => {
    const created = await createTheme(makeThemeInput())
    expect(created.success).toBe(true)
    const id = created.data!.id

    const badColors = makeThemeColors({ primary: 'invalid-color' })
    const result = await updateThemeById(id, { colors: badColors })

    expect(result.success).toBe(false)
    expect(result.validationErrors).toBeDefined()
    expect(result.validationErrors!.some(e => e.code === 'INVALID_COLOR')).toBe(true)
  })
})

describe('getThemeById', () => {
  it('returns theme data for existing theme', async () => {
    const created = await createTheme(makeThemeInput())
    expect(created.success).toBe(true)
    const id = created.data!.id

    const result = await getThemeById(id)

    expect(result.success).toBe(true)
    expect(result.data!.id).toBe(id)
    expect(result.data!.name).toBe('test-theme')
  })

  it('returns error for non-existent theme', async () => {
    const result = await getThemeById('does-not-exist')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Theme not found')
  })

  it('increments download count for public themes', async () => {
    const created = await createTheme(makeThemeInput({ isPublic: true }))
    expect(created.success).toBe(true)
    const id = created.data!.id

    // First get returns theme before the increment is visible in returned data
    // (incrementThemeDownloadCount runs after getTheme returns the data)
    await getThemeById(id)

    // Second get: the DB was incremented by the first call, so this read sees count=1
    // But this call also increments again, so after this call DB has count=2
    const secondGet = await getThemeById(id)
    expect(secondGet.success).toBe(true)
    // The returned data comes from getTheme BEFORE increment, so it shows the DB state
    // which already has count=1 from the first call's increment
    expect(secondGet.data!.downloadCount).toBe(1)
  })

  it('does NOT increment download count for private themes', async () => {
    const created = await createTheme(makeThemeInput({ isPublic: false }))
    expect(created.success).toBe(true)
    const id = created.data!.id

    await getThemeById(id)
    await getThemeById(id)

    const result = await getThemeById(id)
    expect(result.success).toBe(true)
    expect(result.data!.downloadCount).toBe(0)
  })
})

describe('searchThemes', () => {
  it('defaults to public-only when no authorId specified', async () => {
    await createTheme(makeThemeInput({ name: 'public-theme', isPublic: true }))
    await createTheme(makeThemeInput({ name: 'private-theme', isPublic: false }))

    const result = await searchThemes({})

    expect(result.success).toBe(true)
    expect(result.data!.length).toBe(1)
    expect(result.data![0].name).toBe('public-theme')
  })

  it('returns all themes when authorId is specified', async () => {
    await createTheme(makeThemeInput({ name: 'public-theme', isPublic: true, authorId: 'author-1' }))
    await createTheme(makeThemeInput({ name: 'private-theme', isPublic: false, authorId: 'author-1' }))

    const result = await searchThemes({ authorId: 'author-1' })

    expect(result.success).toBe(true)
    expect(result.data!.length).toBe(2)
  })

  it('filters by query text (searches name, displayName, description)', async () => {
    const authorId = 'search-author'
    await createTheme(makeThemeInput({ name: 'ocean-blue', displayName: 'Ocean Blue', description: 'A calm theme', authorId }))
    await createTheme(makeThemeInput({ name: 'fire-red', displayName: 'Fire Red', description: 'A hot theme', authorId }))

    // Use authorId to bypass public-only filter and focus on query text filtering
    const result = await searchThemes({ query: 'ocean', authorId })

    expect(result.success).toBe(true)
    expect(result.data!.length).toBe(1)
    expect(result.data![0].name).toBe('ocean-blue')
  })

  it('supports sort options', async () => {
    const authorId = 'sort-author'
    await createTheme(makeThemeInput({ name: 'alpha-theme', displayName: 'Alpha', authorId }))
    await new Promise(r => setTimeout(r, 10))
    await createTheme(makeThemeInput({ name: 'beta-theme', displayName: 'Beta', authorId }))

    // Use authorId to get all themes regardless of public status
    const result = await searchThemes({ sortBy: 'name', sortOrder: 'asc', authorId })

    expect(result.success).toBe(true)
    expect(result.data!.length).toBe(2)
    expect(result.data![0].name).toBe('alpha-theme')
    expect(result.data![1].name).toBe('beta-theme')
  })

  it('supports pagination (limit/offset)', async () => {
    await createTheme(makeThemeInput({ name: 'theme-a', displayName: 'Theme A' }))
    await createTheme(makeThemeInput({ name: 'theme-b', displayName: 'Theme B' }))
    await createTheme(makeThemeInput({ name: 'theme-c', displayName: 'Theme C' }))

    const page1 = await searchThemes({ sortBy: 'name', sortOrder: 'asc', limit: 2 })
    expect(page1.success).toBe(true)
    expect(page1.data!.length).toBe(2)

    const page2 = await searchThemes({ sortBy: 'name', sortOrder: 'asc', limit: 2, offset: 2 })
    expect(page2.success).toBe(true)
    expect(page2.data!.length).toBe(1)
  })
})

describe('deleteThemeById', () => {
  it('deletes theme successfully', async () => {
    const created = await createTheme(makeThemeInput())
    expect(created.success).toBe(true)
    const id = created.data!.id

    const result = await deleteThemeById(id)
    expect(result.success).toBe(true)

    const get = await getThemeById(id)
    expect(get.success).toBe(false)
    expect(get.error).toBe('Theme not found')
  })

  it('returns error for non-existent theme', async () => {
    const result = await deleteThemeById('nonexistent-id')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Theme not found')
  })

  it('returns unauthorized error when authorId does not match', async () => {
    const created = await createTheme(makeThemeInput({ authorId: 'owner-1' }))
    expect(created.success).toBe(true)
    const id = created.data!.id

    const result = await deleteThemeById(id, 'different-user')

    expect(result.success).toBe(false)
    expect(result.error).toContain('Unauthorized')
  })

  it('allows deletion when no authorId is provided', async () => {
    const created = await createTheme(makeThemeInput({ authorId: 'owner-1' }))
    expect(created.success).toBe(true)
    const id = created.data!.id

    const result = await deleteThemeById(id)

    expect(result.success).toBe(true)
  })
})

describe('exportThemeById', () => {
  it('exports theme with version and exportedAt fields', async () => {
    const created = await createTheme(makeThemeInput())
    expect(created.success).toBe(true)
    const id = created.data!.id

    const result = await exportThemeById(id)

    expect(result.success).toBe(true)
    expect(result.data!.version).toBe('1.0.0')
    expect(result.data!.exportedAt).toBeDefined()
    expect(result.data!.exportedBy).toBe('observability-system')
    expect(result.data!.theme).toBeDefined()
  })

  it('strips server-specific fields from exported theme', async () => {
    const created = await createTheme(makeThemeInput())
    expect(created.success).toBe(true)
    const id = created.data!.id

    const result = await exportThemeById(id)

    expect(result.success).toBe(true)
    const exported = result.data!.theme
    expect(exported.id).toBeUndefined()
    expect(exported.authorId).toBeUndefined()
    expect(exported.downloadCount).toBeUndefined()
    expect(exported.rating).toBeUndefined()
    expect(exported.ratingCount).toBeUndefined()
    expect(exported.createdAt).toBeUndefined()
    expect(exported.updatedAt).toBeUndefined()
  })

  it('returns error for non-existent theme', async () => {
    const result = await exportThemeById('no-such-id')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Theme not found')
  })
})

describe('importTheme', () => {
  it('imports theme with isPublic set to false', async () => {
    const exportedTheme = {
      theme: {
        name: 'imported-theme',
        displayName: 'Imported Theme',
        colors: makeThemeColors(),
        isPublic: true,
        tags: ['imported'],
      }
    }

    const result = await importTheme(exportedTheme, 'importer-123')

    expect(result.success).toBe(true)
    expect(result.data!.isPublic).toBe(false)
  })

  it('passes authorId through to created theme', async () => {
    const exportedTheme = {
      theme: {
        name: 'authored-import',
        displayName: 'Authored Import',
        colors: makeThemeColors(),
        tags: [],
      }
    }

    const result = await importTheme(exportedTheme, 'my-author-id')

    expect(result.success).toBe(true)
    expect(result.data!.authorId).toBe('my-author-id')
  })

  it('returns error when import data is missing theme property', async () => {
    const result = await importTheme({}, 'author-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Invalid import data - missing theme')
  })
})

describe('getThemeStats', () => {
  it('returns correct stats', async () => {
    await createTheme(makeThemeInput({ name: 'public-1', isPublic: true }))
    await createTheme(makeThemeInput({ name: 'public-2', isPublic: true }))
    await createTheme(makeThemeInput({ name: 'private-1', isPublic: false }))

    const result = await getThemeStats()

    expect(result.success).toBe(true)
    expect(result.data!.totalThemes).toBe(3)
    expect(result.data!.publicThemes).toBe(2)
    expect(result.data!.privateThemes).toBe(1)
    expect(result.data!.totalDownloads).toBe(0)
    expect(result.data!.averageRating).toBe(0)
  })

  it('returns zero stats when no themes exist', async () => {
    const result = await getThemeStats()

    expect(result.success).toBe(true)
    expect(result.data!.totalThemes).toBe(0)
    expect(result.data!.publicThemes).toBe(0)
    expect(result.data!.privateThemes).toBe(0)
    expect(result.data!.totalDownloads).toBe(0)
    expect(result.data!.averageRating).toBe(0)
  })
})
