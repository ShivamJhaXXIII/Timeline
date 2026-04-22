import { randomUUID } from 'node:crypto'
import type { DatabaseSync, SQLInputValue } from 'node:sqlite'
import type { CaptureInsert, CaptureMetadata } from './database.js'

export type CaptureRecord = {
    id: string
    capturedAt: string
    screenshotPath: string
    windowTitle: string
    appName: string
    appPath: string | null
    isIdle: boolean
    metadata: CaptureMetadata
    createdAt: string
}

export type CaptureListQuery = {
    from?: string
    to?: string
    appName?: string
    limit?: number
    offset?: number
}

export type CaptureUpdate = {
    screenshotPath?: string
    capturedAt?: string
    metadata?: CaptureMetadata
}

type CaptureRow = {
    id: string
    captured_at: string
    screenshot_path: string
    window_title: string
    app_name: string
    app_path: string | null
    is_idle: number
    metadata_json: string
    created_at: string
}

function parseMetadata(metadataJson: string, row: CaptureRow): CaptureMetadata {
    try {
        const parsed = JSON.parse(metadataJson) as Partial<CaptureMetadata>
        return {
            windowTitle: typeof parsed.windowTitle === 'string' ? parsed.windowTitle : row.window_title,
            appName: typeof parsed.appName === 'string' ? parsed.appName : row.app_name,
            appPath: typeof parsed.appPath === 'string' || parsed.appPath === null ? parsed.appPath : row.app_path,
            isIdle: typeof parsed.isIdle === 'boolean' ? parsed.isIdle : Boolean(row.is_idle),
            idleSeconds: typeof parsed.idleSeconds === 'number' ? parsed.idleSeconds : 0,
            idleThresholdSeconds: typeof parsed.idleThresholdSeconds === 'number' ? parsed.idleThresholdSeconds : 0,
            idleStatus: typeof parsed.idleStatus === 'string' ? parsed.idleStatus : 'unknown',
        }
    } catch {
        return {
            windowTitle: row.window_title,
            appName: row.app_name,
            appPath: row.app_path,
            isIdle: Boolean(row.is_idle),
            idleSeconds: 0,
            idleThresholdSeconds: 0,
            idleStatus: 'unknown',
        }
    }
}

function toCaptureRecord(row: CaptureRow): CaptureRecord {
    return {
        id: row.id,
        capturedAt: row.captured_at,
        screenshotPath: row.screenshot_path,
        windowTitle: row.window_title,
        appName: row.app_name,
        appPath: row.app_path,
        isIdle: Boolean(row.is_idle),
        metadata: parseMetadata(row.metadata_json, row),
        createdAt: row.created_at,
    }
}

function normalizeLimit(limit: number | undefined) {
    if (typeof limit !== 'number' || !Number.isFinite(limit)) {
        return 100
    }

    return Math.max(1, Math.min(500, Math.trunc(limit)))
}

function normalizeOffset(offset: number | undefined) {
    if (typeof offset !== 'number' || !Number.isFinite(offset)) {
        return 0
    }

    return Math.max(0, Math.trunc(offset))
}

export class CaptureRepository {
    constructor(private readonly db: DatabaseSync) {}

    create(capture: CaptureInsert): CaptureRecord {
        const id = randomUUID()
        this.db.prepare(`
            INSERT INTO captures (
                id,
                captured_at,
                screenshot_path,
                window_title,
                app_name,
                app_path,
                is_idle,
                metadata_json
            ) VALUES (
                @id,
                @capturedAt,
                @screenshotPath,
                @windowTitle,
                @appName,
                @appPath,
                @isIdle,
                @metadataJson
            )
        `).run({
            id,
            capturedAt: capture.capturedAt,
            screenshotPath: capture.screenshotPath,
            windowTitle: capture.metadata.windowTitle,
            appName: capture.metadata.appName,
            appPath: capture.metadata.appPath,
            isIdle: Number(capture.metadata.isIdle),
            metadataJson: JSON.stringify(capture.metadata),
        })

        const row = this.db
            .prepare('SELECT * FROM captures WHERE id = @id')
            .get({ id }) as CaptureRow | undefined

        if (!row) {
            throw new Error('Capture insert succeeded but record could not be read back.')
        }

        return toCaptureRecord(row)
    }

    findById(id: string): CaptureRecord | null {
        const row = this.db
            .prepare('SELECT * FROM captures WHERE id = @id')
            .get({ id }) as CaptureRow | undefined

        if (!row) {
            return null
        }

        return toCaptureRecord(row)
    }

    findByDateRange(query: CaptureListQuery = {}): CaptureRecord[] {
        const whereClauses: string[] = []
        const params: Record<string, SQLInputValue> = {
            limit: normalizeLimit(query.limit),
            offset: normalizeOffset(query.offset),
        }

        if (query.from) {
            whereClauses.push('captured_at >= @from')
            params.from = query.from
        }

        if (query.to) {
            whereClauses.push('captured_at <= @to')
            params.to = query.to
        }

        if (query.appName && query.appName.trim()) {
            whereClauses.push('lower(app_name) LIKE lower(@appName)')
            params.appName = `%${query.appName.trim()}%`
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''
        const statement = this.db.prepare(`
            SELECT *
            FROM captures
            ${whereSql}
            ORDER BY captured_at DESC
            LIMIT @limit OFFSET @offset
        `)

        const rows = statement.all(params) as CaptureRow[]
        return rows.map(toCaptureRecord)
    }

    updateById(id: string, update: CaptureUpdate): CaptureRecord | null {
        const current = this.findById(id)
        if (!current) {
            return null
        }

        const nextCapturedAt = update.capturedAt ?? current.capturedAt
        const nextScreenshotPath = update.screenshotPath ?? current.screenshotPath
        const nextMetadata = update.metadata ?? current.metadata

        this.db.prepare(`
            UPDATE captures
            SET
                captured_at = @capturedAt,
                screenshot_path = @screenshotPath,
                window_title = @windowTitle,
                app_name = @appName,
                app_path = @appPath,
                is_idle = @isIdle,
                metadata_json = @metadataJson
            WHERE id = @id
        `).run({
            id,
            capturedAt: nextCapturedAt,
            screenshotPath: nextScreenshotPath,
            windowTitle: nextMetadata.windowTitle,
            appName: nextMetadata.appName,
            appPath: nextMetadata.appPath,
            isIdle: Number(nextMetadata.isIdle),
            metadataJson: JSON.stringify(nextMetadata),
        })

        return this.findById(id)
    }

    deleteById(id: string): boolean {
        const result = this.db.prepare('DELETE FROM captures WHERE id = @id').run({ id })
        return result.changes > 0
    }

    deleteByDateRange(from?: string, to?: string): number {
        const whereClauses: string[] = []
        const params: Record<string, SQLInputValue> = {}

        if (from) {
            whereClauses.push('captured_at >= @from')
            params.from = from
        }

        if (to) {
            whereClauses.push('captured_at <= @to')
            params.to = to
        }

        if (whereClauses.length === 0) {
            return 0
        }

        const result = this.db
            .prepare(`DELETE FROM captures WHERE ${whereClauses.join(' AND ')}`)
            .run(params)

        return Number(result.changes)
    }
}

export function createCaptureRepository(db: DatabaseSync) {
    return new CaptureRepository(db)
}
