import { BrowserWindow, powerMonitor } from 'electron';
import type { IdleInfo, IdleStatus } from './types/IdleInfo.js';

type IdleTrackerOptions = {
    pollIntervalMs?: number;
    idleThresholdSeconds?: number;
};

export class IdleTracker {
    private trackedWindow: BrowserWindow | null = null;
    private readonly pollIntervalMs: number;
    private readonly idleThresholdSeconds: number;
    private pollTimer: NodeJS.Timeout | null = null;

    private onLocked = () => this.publish('locked');
    private onSuspended = () => this.publish('suspended');
    private onResumed = () => this.publish('active');

    constructor(options: IdleTrackerOptions = {}) {
        this.pollIntervalMs = options.pollIntervalMs ?? 1000;
        this.idleThresholdSeconds = options.idleThresholdSeconds ?? 60;
    }

    attachWindow(window: BrowserWindow | null): void {
        this.trackedWindow = window;
    }

    start(): void {
        if (this.pollTimer) return;

        powerMonitor.on('lock-screen', this.onLocked);
        powerMonitor.on('suspend', this.onSuspended);
        powerMonitor.on('resume', this.onResumed);

        this.pollTimer = setInterval(() => this.publish(), this.pollIntervalMs);
        this.publish();
    }

    stop(): void {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }

        powerMonitor.removeListener('lock-screen', this.onLocked);
        powerMonitor.removeListener('suspend', this.onSuspended);
        powerMonitor.removeListener('resume', this.onResumed);
    }

    getIdleInfo(statusOverride?: IdleStatus): IdleInfo {
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

    private publish(statusOverride?: IdleStatus): void {
        if (!this.trackedWindow || this.trackedWindow.isDestroyed()) return;
        this.trackedWindow.webContents.send('idle:update', this.getIdleInfo(statusOverride));
    }
}
