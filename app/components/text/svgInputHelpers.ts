import fustatData from "./fustat-data.json";

export type FontWeight = keyof typeof fustatData;
export type GlyphMap = Record<string, { path: string; width: number }>;
export type KernMap = Record<string, number>;
export type GlyphPath = { d: string; x: number };

export const BASE = 24;
export const BLINK_MS = 530;

export function buildGlyphs(
    text: string,
    glyphs: GlyphMap,
    kern: KernMap,
    letterSpacingFU: number = 0
): { paths: { d: string; x: number }[]; xPositions: number[]; totalWidth: number } {
    let x = 0;
    const paths: { d: string; x: number }[] = [];
    // xPositions[i] = left edge of character i in font-units.
    // xPositions[text.length] = right edge of the last character.
    const xPositions: number[] = [0];

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];
        const g = glyphs[char];

        if (!g) {
            const sw = glyphs[" "]?.width ?? 6;
            x += sw + letterSpacingFU;
            xPositions.push(x);
            continue;
        }

        paths.push({ d: g.path, x });
        const k = next ? (kern[char + next] ?? 0) : 0;
        x += g.width + k + letterSpacingFU;
        xPositions.push(x);
    }

    // Remove the extra letter spacing at the very end
    if (text.length > 0) {
        x -= letterSpacingFU;
        xPositions[text.length] = x;
    }

    return { paths, xPositions, totalWidth: x };
}
