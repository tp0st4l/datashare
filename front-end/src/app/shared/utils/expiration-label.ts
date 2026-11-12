const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function daysUntilExpiration(expiresAt: string, now: Date = new Date()): number {
    return Math.round((startOfDay(new Date(expiresAt)) - startOfDay(now)) / DAY_MS);
}

export function expirationLabel(expiresAt: string, now: Date = new Date()): string {
    if (new Date(expiresAt) <= now) {
        return 'Expiré';
    }
    const days = daysUntilExpiration(expiresAt, now);
    if (days === 0) {
        return "Expire aujourd'hui";
    }
    if (days === 1) {
        return 'Expire demain';
    }
    return `Expire dans ${days} jours`;
}