export function daysInMonth(month: number, year: number) {
    return new Date(year, month + 1, 0).getDate();
}

export function firstDayOfMonth(month: number, year: number) {
    // Returns Mon=0 … Sun=6
    const d = new Date(year, month, 1).getDay();
    return d === 0 ? 6 : d - 1;
}

export function ordinal(n: number) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
