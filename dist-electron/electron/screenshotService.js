import path from 'node:path';
import { captureScreen } from './captureScreen.js';
const DEFAULT_INTERVAL_MS = 60_000;
const MAX_BACKOFF_MS = 10 * 60_000;
let timer = null;
let running = false;
let currentOutputDir = null;
let currentIntervalMs = DEFAULT_INTERVAL_MS;
let currentDelayMs = DEFAULT_INTERVAL_MS;
let nextCaptureInMs = null;
let lastCaptureAt = null;
let lastCapturePath = null;
let lastError = null;
let pendingCaptureHandler = null;
function normalizeIntervalMs(intervalMs) {
    if (typeof intervalMs !== 'number' || !Number.isFinite(intervalMs)) {
        return DEFAULT_INTERVAL_MS;
    }
    return Math.max(1_000, Math.round(intervalMs));
}
function normalizeOutputDir(outputDir) {
    const resolved = (outputDir ?? path.join(process.cwd(), 'screenshots')).trim();
    if (!resolved) {
        throw new Error('A screenshot output directory is required.');
    }
    return resolved;
}
function clearTimer() {
    if (timer) {
        clearTimeout(timer);
        timer = null;
    }
    nextCaptureInMs = null;
}
function scheduleNextCapture(delayMs) {
    if (!running)
        return;
    clearTimer();
    const clampedDelay = Math.max(0, Math.round(delayMs));
    nextCaptureInMs = clampedDelay;
    timer = setTimeout(() => {
        timer = null;
        nextCaptureInMs = null;
        void runCaptureCycle();
    }, clampedDelay);
}
async function runCaptureCycle() {
    if (!running || !currentOutputDir)
        return;
    try {
        const filePath = await captureScreen({
            outputDir: currentOutputDir,
            quality: 85,
        });
        const capturedAt = new Date().toISOString();
        if (typeof pendingCaptureHandler === 'function') {
            await pendingCaptureHandler({
                filePath,
                capturedAt,
            });
        }
        lastCaptureAt = capturedAt;
        lastCapturePath = filePath;
        lastError = null;
        currentDelayMs = currentIntervalMs;
        console.log('Screenshot saved:', filePath);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown screenshot capture error.';
        lastError = message;
        console.error('Screenshot capture failed:', error);
        currentDelayMs = Math.min(Math.max(currentDelayMs * 2, currentIntervalMs), MAX_BACKOFF_MS);
    }
    finally {
        if (running) {
            scheduleNextCapture(currentDelayMs);
        }
    }
}
function getState() {
    return {
        running,
        outputDir: currentOutputDir,
        intervalMs: currentIntervalMs,
        nextCaptureInMs,
        lastCaptureAt,
        lastCapturePath,
        lastError,
    };
}
export function startScreenShotService(options = {}) {
    if (running) {
        return getState();
    }
    currentOutputDir = normalizeOutputDir(options.outputDir);
    currentIntervalMs = normalizeIntervalMs(options.intervalMs);
    currentDelayMs = currentIntervalMs;
    pendingCaptureHandler = options.onCapture ?? null;
    lastError = null;
    running = true;
    scheduleNextCapture(0);
    return getState();
}
export function stopScreenShotService() {
    running = false;
    clearTimer();
    pendingCaptureHandler = null;
    return getState();
}
export function getScreenShotServiceState() {
    return getState();
}
export const startScreenshotService = startScreenShotService;
export const stopScreenshotService = stopScreenShotService;
