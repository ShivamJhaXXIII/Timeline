import path from 'node:path'
import { captureScreen } from './captureScreen.js'

export type ScreenshotServiceState = {
    running: boolean
    outputDir: string | null
    intervalMs: number
    nextCaptureInMs: number | null
    lastCaptureAt: string | null
    lastCapturePath: string | null
    lastError: string | null
}

export type StartScreenshotServiceOptions = {
    outputDir?: string
    intervalMs?: number
}

const DEFAULT_INTERVAL_MS = 60_000
const MAX_BACKOFF_MS = 10 * 60_000

let timer: ReturnType<typeof setTimeout> | null = null
let running = false
let currentOutputDir: string | null = null
let currentIntervalMs = DEFAULT_INTERVAL_MS
let currentDelayMs = DEFAULT_INTERVAL_MS
let nextCaptureInMs: number | null = null
let lastCaptureAt: string | null = null
let lastCapturePath: string | null = null
let lastError: string | null = null

function normalizeIntervalMs(intervalMs?: number) {
    if (typeof intervalMs !== 'number' || !Number.isFinite(intervalMs)) {
        return DEFAULT_INTERVAL_MS
    }

    return Math.max(1_000, Math.round(intervalMs))
}

function normalizeOutputDir(outputDir?: string) {
    const resolved = (outputDir ?? path.join(process.cwd(), 'screenshots')).trim()
    if (!resolved) {
        throw new Error('A screenshot output directory is required.')
    }

    return resolved
}

function clearTimer() {
    if (timer) {
        clearTimeout(timer)
        timer = null
    }
    nextCaptureInMs = null
}

function scheduleNextCapture(delayMs: number) {
    if (!running) return

    clearTimer()
    const clampedDelay = Math.max(0, Math.round(delayMs))
    nextCaptureInMs = clampedDelay

    timer = setTimeout(() => {
        timer = null
        nextCaptureInMs = null

        void runCaptureCycle()
    }, clampedDelay)
}

async function runCaptureCycle() {
    if (!running || !currentOutputDir) return

    try {
        const filePath = await captureScreen({
            outputDir: currentOutputDir,
            quality: 85,
        })

        lastCaptureAt = new Date().toISOString()
        lastCapturePath = filePath
        lastError = null
        currentDelayMs = currentIntervalMs
        console.log('Screenshot saved:', filePath)
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown screenshot capture error.'
        lastError = message
        console.error('Screenshot capture failed:', error)
        currentDelayMs = Math.min(Math.max(currentDelayMs * 2, currentIntervalMs), MAX_BACKOFF_MS)
    } finally {
        if (running) {
            scheduleNextCapture(currentDelayMs)
        }
    }
}

function getState(): ScreenshotServiceState {
    return {
        running,
        outputDir: currentOutputDir,
        intervalMs: currentIntervalMs,
        nextCaptureInMs,
        lastCaptureAt,
        lastCapturePath,
        lastError,
    }
}

export function startScreenShotService(options: StartScreenshotServiceOptions = {}) {
    if (running) {
        return getState()
    }

    currentOutputDir = normalizeOutputDir(options.outputDir)
    currentIntervalMs = normalizeIntervalMs(options.intervalMs)
    currentDelayMs = currentIntervalMs
    lastError = null
    running = true

    scheduleNextCapture(0)

    return getState()
}

export function stopScreenShotService() {
    running = false
    clearTimer()

    return getState()
}

export function getScreenShotServiceState() {
    return getState()
}

export const startScreenshotService = startScreenShotService
export const stopScreenshotService = stopScreenShotService