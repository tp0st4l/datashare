const UNITS = ['o', 'Ko', 'Mo', 'Go'];

export function formatSize(bytes: number): string {
    let size = bytes;
    let unit = 0;
    while (size >= 1024 && unit < UNITS.length - 1) {
        size /= 1024;
        unit++;
    }
    const value = unit === 0 ? size : Math.round(size * 10) / 10;
    return `${value.toLocaleString('fr-FR')} ${UNITS[unit]}`;
}