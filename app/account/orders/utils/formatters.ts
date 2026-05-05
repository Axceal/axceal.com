import type { Address } from "@/lib/contracts/address";

export function formatDateOrdinal(iso: string): string {
    const d = new Date(iso);
    const day = d.getDate();
    const suffix = [11, 12, 13].includes(day % 100)
        ? "th"
        : day % 10 === 1 ? "st"
            : day % 10 === 2 ? "nd"
                : day % 10 === 3 ? "rd"
                    : "th";
    return `${day}${suffix} ${d.toLocaleDateString("en-IN", { month: "long" })} ${d.getFullYear()}`;
}

export function formatPrice(paise: number): string {
    return `INR ${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function formatAddressLines(addr: Address): string[] {
    return [
        `${addr.firstName} ${addr.lastName}`,
        addr.line1,
        `${addr.state}, ${addr.country} - ${addr.zip}`,
    ];
}

export function formatOrderRef(id: string): string {
    const chars = id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 9).padEnd(9, "0");
    return `${chars.slice(0, 3)}-${chars.slice(3, 6)}-${chars.slice(6, 9)}`;
}

export function formatPhone(addr: Address): string {
    return `${addr.phoneSign}${addr.phoneCountryCode} ${addr.phone}`;
}
