import assert from 'node:assert/strict'
import { test } from 'node:test'

const captureScreenUrl = new URL('../dist-electron/electron/captureScreen.js', import.meta.url)
const idleTrackerUrl = new URL('../dist-electron/electron/IdleTracker.js', import.meta.url)
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

  t.mock.module(captureScreenUrl, {
    namedExports: {
      captureScreen,
    },
  })

  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] })

  const { startScreenShotService, stopScreenShotService, getScreenShotServiceState } = await import(screenshotServiceUrl.href)

  const startedState = startScreenShotService({ outputDir: 'C:\\captures', intervalMs: 1000 })
  assert.equal(startedState.running, true)
  assert.equal(startedState.outputDir, 'C:\\captures')

  t.mock.timers.tick(1)
  await t.waitFor(() => captureScreen.mock.callCount() === 1)

  const runningState = getScreenShotServiceState()
  assert.equal(runningState.running, true)
  assert.equal(runningState.lastCapturePath, 'C:\\captures\\2026\\04\\12\\16\\screenshot.jpg')

  const stoppedState = stopScreenShotService()
  assert.equal(stoppedState.running, false)
  assert.equal(stoppedState.nextCaptureInMs, null)
})