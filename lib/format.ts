// W5 — paise → "₹9,999" (no decimals; INR display elsewhere on the site
// is always whole rupees). `en-IN` locale for the Indian comma grouping
// (1,00,000 not 100,000).
export function formatINR(paise: number): string {
  const rupees = Math.round(paise / 100);
  return `₹${rupees.toLocaleString("en-IN")}`;
}

// W5 — position display, e.g. 1247 → "#1,247". Same locale grouping.
export function formatPosition(position: number): string {
  return `#${position.toLocaleString("en-IN")}`;
}

// Truncate an email when its local part (everything before @) exceeds
// maxLocalLen. Domain is preserved in full. Strategy: keep the first
// maxLocalLen chars of the local part, append "…", then the original domain.
export function elideEmail(email: string, maxLocalLen = 20): string {
    const at = email.indexOf("@");
    if (at < 0) {
        // No domain — treat the whole string as local.
        return email.length > maxLocalLen ? email.slice(0, maxLocalLen) + "…" : email;
    }
    const local = email.slice(0, at);
    const domain = email.slice(at); // includes leading @
    if (local.length <= maxLocalLen) return email;
    return local.slice(0, maxLocalLen) + "…" + domain;
}
