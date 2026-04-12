import { powerMonitor } from 'electron';
import { DEFAULT_IDLE_THRESHOLD_SECONDS, IDLE_POLL_INTERVAL_MS } from './config/constants.js';
export class IdleTracker {
    trackedWindow = null;
    pollIntervalMs;
    idleThresholdSeconds;
    pollTimer = null;
    onLocked = () => this.publish('locked');
    onSuspended = () => this.publish('suspended');
    onResumed = () => this.publish('active');
    constructor(options = {}) {
        this.pollIntervalMs = options.pollIntervalMs ?? IDLE_POLL_INTERVAL_MS;
        this.idleThresholdSeconds = options.idleThresholdSeconds ?? DEFAULT_IDLE_THRESHOLD_SECONDS;
    }
    attachWindow(window) {
        this.trackedWindow = window;
    }
    start() {
        if (this.pollTimer)
            return;
        powerMonitor.on('lock-screen', this.onLocked);
        powerMonitor.on('suspend', this.onSuspended);
        powerMonitor.on('resume', this.onResumed);
        this.pollTimer = setInterval(() => this.publish(), this.pollIntervalMs);
        this.publish();
    }
    stop() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        powerMonitor.removeListener('lock-screen', this.onLocked);
        powerMonitor.removeListener('suspend', this.onSuspended);
        powerMonitor.removeListener('resume', this.onResumed);
    }
    getIdleInfo(statusOverride) {
        const idleSeconds = powerMonitor.getSystemIdleTime();
        const isIdle = idleSeconds >= this.idleThresholdSeconds;
        return {
            idleSeconds,
            thresholdSeconds: this.idleThresholdSeconds,
            isIdle,
            status: statusOverride ?? (isIdle ? 'idle' : 'active'),
            checkedAt: new Date().toISOString(),
        };
    }
    publish(statusOverride) {
        if (!this.trackedWindow || this.trackedWindow.isDestroyed())
            return;
        this.trackedWindow.webContents.send('idle:update', this.getIdleInfo(statusOverride));
    }
}
