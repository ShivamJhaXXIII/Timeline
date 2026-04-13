import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export type CaptureMetadata = {
    windowTitle: string
    appName: string
    appPath: string | null
    isIdle: boolean
    idleSeconds: number
    idleThresholdSeconds: number
    idleStatus: string
}

export type CaptureInsert = {
    screenshotPath: string
    capturedAt: string
    metadata: CaptureMetadata
}

const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS captures (
    id TEXT PRIMARY KEY,
    captured_at TEXT NOT NULL,
    screenshot_path TEXT NOT NULL UNIQUE,
    window_title TEXT NOT NULL DEFAULT '',
    app_name TEXT NOT NULL DEFAULT '',
    app_path TEXT,
    is_idle INTEGER NOT NULL DEFAULT 0,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_captures_captured_at ON captures (captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_captures_app_name ON captures (app_name);
`

let database: DatabaseSync | null = null

export function configureDatabase(db: DatabaseSync) {
    db.exec(SCHEMA)
    return db
}

function buildDatabasePath(userDataDir: string) {
    return path.join(userDataDir, 'timeline.db')
}

export function initializeDatabase(userDataDir: string) {
    if (database) {
        return database
    }

    const dbPath = buildDatabasePath(userDataDir)
    database = configureDatabase(new DatabaseSync(dbPath))
    return database
}

export function insertCaptureRecord(db: DatabaseSync, capture: CaptureInsert) {
    const statement = db.prepare(`
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
            lower(hex(randomblob(16))),
            @capturedAt,
            @screenshotPath,
            @windowTitle,
            @appName,
            @appPath,
            @isIdle,
            @metadataJson
        )
    `)

    statement.run({
        capturedAt: capture.capturedAt,
        screenshotPath: capture.screenshotPath,
        windowTitle: capture.metadata.windowTitle,
        appName: capture.metadata.appName,
        appPath: capture.metadata.appPath,
        isIdle: Number(capture.metadata.isIdle),
        metadataJson: JSON.stringify(capture.metadata),
    })
}

export function closeDatabase() {
    if (!database) {
        return
    }

    database.close()
    database = null
}