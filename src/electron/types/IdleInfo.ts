export type IdleStatus = 'active' | 'idle' | 'locked' | 'suspended' | 'unknown';

export type IdleInfo = {
    idleSeconds: number;
    thresholdSeconds: number;
    isIdle: boolean;
    status: IdleStatus;
    checkedAt: string;
};
