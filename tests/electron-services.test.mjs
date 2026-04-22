import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'

const captureScreenUrl = new URL('../dist-electron/electron/captureScreen.js', import.meta.url)
const idleTrackerUrl = new URL('../dist-electron/electron/IdleTracker.js', import.meta.url)
const databaseUrl = new URL('../dist-electron/electron/database.js', import.meta.url)
const captureRepositoryUrl = new URL('../dist-electron/electron/captureRepository.js', import.meta.url)
const screenshotServiceUrl = new URL('../dist-electron/electron/screenshotService.js', import.meta.url)
const windowTrackerUrl = new URL('../dist-electron/electron/WindowTracker.js', import.meta.url)

test('captureScreen saves into a dated JPEG path', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date(2026, 3, 12, 16, 53, 6, 287) })

  const mkdir = t.mock.fn(async () => {})
  const writeFile = t.mock.fn(async () => {})
  const toJPEG = t.mock.fn(() => Buffer.from('image-data'))

  t.mock.module('electron', {
    namedExports: {
      desktopCapturer: {
        getSources: t.mock.fn(async () => [
          {
            thumbnail: {
              isEmpty: () => false,
              toJPEG,
            },
          },
        ]),
      },
    },
  })

  t.mock.module('node:crypto', {
    namedExports: {
      randomUUID: () => '11111111-1111-4111-8111-111111111111',
    },
  })

  t.mock.module('node:fs/promises', {
    defaultExport: {
      mkdir,
      writeFile,
    },
  })

  const { captureScreen } = await import(captureScreenUrl.href)

  const filePath = await captureScreen({ outputDir: 'C:\\captures' })

  assert.ok(filePath.startsWith('C:\\captures\\2026\\04\\12\\16\\'))
  assert.match(filePath, /screenshot-2026-04-12T.*-11111111-1111-4111-8111-111111111111\.jpg$/)
  assert.equal(mkdir.mock.callCount(), 1)
  assert.equal(writeFile.mock.callCount(), 1)
  assert.equal(toJPEG.mock.callCount(), 1)
})

test('IdleTracker builds idle state from the current idle time', async (t) => {
  const removeListener = t.mock.fn()
  const on = t.mock.fn()

  t.mock.module('electron', {
    namedExports: {
      BrowserWindow: class {},
      powerMonitor: {
        getSystemIdleTime: () => 120,
        on,
        removeListener,
      },
    },
  })

  const { IdleTracker } = await import(idleTrackerUrl.href)
  const tracker = new IdleTracker({ idleThresholdSeconds: 60 })
  const idleInfo = tracker.getIdleInfo('locked')

  assert.deepEqual({
    idleSeconds: idleInfo.idleSeconds,
    thresholdSeconds: idleInfo.thresholdSeconds,
    isIdle: idleInfo.isIdle,
    status: idleInfo.status,
  }, {
    idleSeconds: 120,
    thresholdSeconds: 60,
    isIdle: true,
    status: 'locked',
  })
  assert.match(idleInfo.checkedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('WindowTracker normalizes missing window fields', async (t) => {
  t.mock.module('node:util', {
    namedExports: {
      promisify: () => async () => ({
        stdout: JSON.stringify({ title: 'Docs', pid: 321 }),
      }),
    },
  })

  const { WindowTracker } = await import(windowTrackerUrl.href)
  const tracker = new WindowTracker()
  const windowInfo = await tracker.getActiveWindow()

  assert.deepEqual(windowInfo, {
    title: 'Docs',
    app: '',
    owner: '',
    pid: 321,
  })
})

test('screenshot service starts and stops cleanly', async (t) => {
  const captureScreen = t.mock.fn(async () => 'C:\\captures\\2026\\04\\12\\16\\screenshot.jpg')
  const onCapture = t.mock.fn(async () => {})

  t.mock.module(captureScreenUrl, {
    namedExports: {
      captureScreen,
    },
  })

  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] })

  const { startScreenShotService, stopScreenShotService, getScreenShotServiceState } = await import(screenshotServiceUrl.href)

  const startedState = startScreenShotService({ outputDir: 'C:\\captures', intervalMs: 1000, onCapture })
  assert.equal(startedState.running, true)
  assert.equal(startedState.outputDir, 'C:\\captures')

  t.mock.timers.tick(1)
  await t.waitFor(() => captureScreen.mock.callCount() === 1)
  await t.waitFor(() => onCapture.mock.callCount() === 1)

  const runningState = getScreenShotServiceState()
  assert.equal(runningState.running, true)
  assert.equal(runningState.lastCapturePath, 'C:\\captures\\2026\\04\\12\\16\\screenshot.jpg')

  const stoppedState = stopScreenShotService()
  assert.equal(stoppedState.running, false)
  assert.equal(stoppedState.nextCaptureInMs, null)
})

test('database schema stores capture paths and metadata', async () => {
  const { configureDatabase, insertCaptureRecord } = await import(databaseUrl.href)
  const db = configureDatabase(new DatabaseSync(':memory:'))

  insertCaptureRecord(db, {
    screenshotPath: 'C:\\captures\\sample.jpg',
    capturedAt: '2026-04-12T16:53:06.287Z',
    metadata: {
      windowTitle: 'Docs',
      appName: 'Code',
      appPath: 'C:\\Program Files\\Code\\Code.exe',
      isIdle: false,
      idleSeconds: 12,
      idleThresholdSeconds: 300,
      idleStatus: 'active',
    },
  })

  const row = db.prepare('select * from captures where screenshot_path = ?').get('C:\\captures\\sample.jpg')

  assert.equal(row.screenshot_path, 'C:\\captures\\sample.jpg')
  assert.equal(row.window_title, 'Docs')
  assert.equal(row.app_name, 'Code')
  assert.equal(row.app_path, 'C:\\Program Files\\Code\\Code.exe')
  assert.equal(row.is_idle, 0)
  assert.deepEqual(JSON.parse(row.metadata_json), {
    windowTitle: 'Docs',
    appName: 'Code',
    appPath: 'C:\\Program Files\\Code\\Code.exe',
    isIdle: false,
    idleSeconds: 12,
    idleThresholdSeconds: 300,
    idleStatus: 'active',
  })

  const versionRow = db.prepare('PRAGMA user_version').get()
  assert.equal(versionRow.user_version, 1)

  const migrationRow = db.prepare('select version, name from schema_migrations where version = 1').get()
  assert.equal(migrationRow.version, 1)
  assert.equal(migrationRow.name, '001_initial.sql')
})

test('CaptureRepository supports CRUD with metadata storage', async () => {
  const { configureDatabase } = await import(databaseUrl.href)
  const { CaptureRepository } = await import(captureRepositoryUrl.href)
  const db = configureDatabase(new DatabaseSync(':memory:'))
  const repository = new CaptureRepository(db)

  const created = repository.create({
    screenshotPath: 'C:\\captures\\repo-1.jpg',
    capturedAt: '2026-04-19T10:00:00.000Z',
    metadata: {
      windowTitle: 'Timeline Plan',
      appName: 'Code',
      appPath: 'C:\\Program Files\\Code\\Code.exe',
      isIdle: false,
      idleSeconds: 2,
      idleThresholdSeconds: 300,
      idleStatus: 'active',
    },
  })

  assert.match(created.id, /^[0-9a-f-]{36}$/)
  assert.equal(created.windowTitle, 'Timeline Plan')
  assert.equal(created.metadata.appName, 'Code')

  const readBack = repository.findById(created.id)
  assert.ok(readBack)
  assert.equal(readBack.screenshotPath, 'C:\\captures\\repo-1.jpg')
  assert.deepEqual(readBack.metadata, {
    windowTitle: 'Timeline Plan',
    appName: 'Code',
    appPath: 'C:\\Program Files\\Code\\Code.exe',
    isIdle: false,
    idleSeconds: 2,
    idleThresholdSeconds: 300,
    idleStatus: 'active',
  })

  const updated = repository.updateById(created.id, {
    screenshotPath: 'C:\\captures\\repo-1-updated.jpg',
    metadata: {
      windowTitle: 'Terminal',
      appName: 'Windows Terminal',
      appPath: 'C:\\Program Files\\WindowsApps\\wt.exe',
      isIdle: true,
      idleSeconds: 400,
      idleThresholdSeconds: 300,
      idleStatus: 'idle',
    },
  })

  assert.ok(updated)
  assert.equal(updated.screenshotPath, 'C:\\captures\\repo-1-updated.jpg')
  assert.equal(updated.metadata.windowTitle, 'Terminal')
  assert.equal(updated.metadata.isIdle, true)

  repository.create({
    screenshotPath: 'C:\\captures\\repo-2.jpg',
    capturedAt: '2026-04-19T11:00:00.000Z',
    metadata: {
      windowTitle: 'Docs',
      appName: 'Browser',
      appPath: null,
      isIdle: false,
      idleSeconds: 0,
      idleThresholdSeconds: 300,
      idleStatus: 'active',
    },
  })

  const inRange = repository.findByDateRange({
    from: '2026-04-19T09:59:59.000Z',
    to: '2026-04-19T10:59:59.999Z',
  })
  assert.equal(inRange.length, 1)
  assert.equal(inRange[0].screenshotPath, 'C:\\captures\\repo-1-updated.jpg')

  const deletedByRange = repository.deleteByDateRange('2026-04-19T10:59:59.999Z', '2026-04-19T12:00:00.000Z')
  assert.equal(deletedByRange, 1)

  const deletedById = repository.deleteById(created.id)
  assert.equal(deletedById, true)
  assert.equal(repository.findById(created.id), null)
})
