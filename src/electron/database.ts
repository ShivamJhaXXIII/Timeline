import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

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

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = path.join(MODULE_DIR, 'sql', 'migrations')
const LATEST_SCHEMA_VERSION = 1

const MIGRATION_FILES: Record<number, string> = {
    1: '001_initial.sql',
}

let database: DatabaseSync | null = null

function readMigrationSql(version: number) {
    const fileName = MIGRATION_FILES[version]
    if (!fileName) {
        throw new Error(`No migration file registered for schema version ${version}`)
    }

    const migrationPath = path.join(MIGRATIONS_DIR, fileName)
    return fs.readFileSync(migrationPath, 'utf8')
}

function getUserVersion(db: DatabaseSync) {
    const row = db.prepare('PRAGMA user_version').get() as { user_version?: number }
    return row.user_version ?? 0
}

function ensureMigrationHistoryTable(db: DatabaseSync) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `)
}

function applyMigrations(db: DatabaseSync) {
    db.exec('PRAGMA foreign_keys = ON')
    ensureMigrationHistoryTable(db)

    const currentVersion = getUserVersion(db)
    if (currentVersion >= LATEST_SCHEMA_VERSION) {
        return
    }

    db.exec('BEGIN IMMEDIATE')
    try {
        for (let version = currentVersion + 1; version <= LATEST_SCHEMA_VERSION; version += 1) {
            const fileName = MIGRATION_FILES[version]
            db.exec(readMigrationSql(version))
            db.prepare(
                `
                INSERT OR IGNORE INTO schema_migrations (version, name)
                VALUES (@version, @name)
                `
            ).run({ version, name: fileName })
            db.exec(`PRAGMA user_version = ${version}`)
        }

        db.exec('COMMIT')
    } catch (error) {
        db.exec('ROLLBACK')
        throw error
    }
}

export function configureDatabase(db: DatabaseSync) {
    applyMigrations(db)
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