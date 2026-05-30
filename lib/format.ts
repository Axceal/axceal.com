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
