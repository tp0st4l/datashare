const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function expirationLabel(expiresAt: string, now: Date = new Date()): string {
    const expiry = new Date(expiresAt);
    if (expiry <= now) {
        return 'Expiré';
    }
    const days = Math.round((startOfDay(expiry) - startOfDay(now)) / DAY_MS);
    if (days === 0) {
        return "Expire aujourd'hui";
    }
    if (days === 1) {
        return 'Expire demain';
    }
    return `Expire dans ${days} jours`;
}