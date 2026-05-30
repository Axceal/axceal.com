// Pure layout primitives for SvgText. Separated so the component file holds
// only render + measurement plumbing; the wrap and glyph-placement algorithms
// are testable standalone.

export const SUP_SCALE = 0.6;
export const BASE_FONT_SIZE = 24;

export type GlyphMap = Record<string, { path: string; width: number }>;
export type KernMap = Record<string, number>;
export type CharEntry = { char: string; color?: string };
export type GlyphEntry = { path: string; x: number; lineY: number; color?: string; char: string };
export type SupGlyph = { path: string; relX: number };

// Soft word-wrap: walk chars, track running line width, and when a non-space
// char would push the line past maxGlyphWidth, retroactively convert the last
// space into a newline. Words longer than the budget with no preceding space
// fall back to a hard char-level break before the overflowing char.
export function softWrap(
    rawChars: CharEntry[],
    glyphMap: GlyphMap,
    kerningTable: KernMap,
    maxGlyphWidth: number,
): CharEntry[] {
    if (maxGlyphWidth === Infinity) return rawChars;
    const chars: CharEntry[] = [];
    let lineWidth = 0;
    let lastSpaceIdx = -1;
    let widthAtLastSpace = 0;

    for (let i = 0; i < rawChars.length; i++) {
        const entry = rawChars[i];
        const { char } = entry;
        if (char === '\r') { chars.push(entry); continue; }
        if (char === '\n') {
            chars.push(entry);
            lineWidth = 0;
            lastSpaceIdx = -1;
            widthAtLastSpace = 0;
            continue;
        }
        const g = glyphMap[char];
        const next = rawChars[i + 1]?.char;
        const glyphW = g ? g.width : (glyphMap[" "]?.width || 6);
        const kern = (g && next && next !== '\n' && next !== '\r') ? (kerningTable[char + next] || 0) : 0;
        const charWidth = glyphW + kern;

        if (char === ' ') {
            chars.push(entry);
            lineWidth += charWidth;
            lastSpaceIdx = chars.length - 1;
            widthAtLastSpace = lineWidth;
            continue;
        }

        if (lineWidth + charWidth > maxGlyphWidth) {
            if (lastSpaceIdx >= 0) {
                // Soft break at the last space — tail migrates to new line.
                chars[lastSpaceIdx] = { char: '\n', color: chars[lastSpaceIdx].color };
                lineWidth = lineWidth - widthAtLastSpace;
                lastSpaceIdx = -1;
                widthAtLastSpace = 0;
            } else if (lineWidth > 0) {
                // Hard char-level break — current "word" alone exceeds the
                // budget (long emails, transaction IDs, URLs).
                chars.push({ char: '\n', color: entry.color });
                lineWidth = 0;
                widthAtLastSpace = 0;
            }
        }
        chars.push(entry);
        lineWidth += charWidth;
    }
    return chars;
}

export type LayoutResult = {
    lineEntries: GlyphEntry[][];
    lineWidths: number[];
    totalWidth: number;
    totalHeight: number;
    currentLineY: number;
    supGlyphs: SupGlyph[];
};

// Walk wrapped chars, place glyphs per line with kerning, compute per-line
// widths and the overall canvas size. Also positions superscript glyphs at
// the end of the last line.
export function layoutGlyphs(
    chars: CharEntry[],
    glyphMap: GlyphMap,
    kerningTable: KernMap,
    lineHeight: number,
    superscript: string | undefined,
): LayoutResult {
    const VERTICAL_SPACING = BASE_FONT_SIZE * lineHeight;
    const lineEntries: GlyphEntry[][] = [[]];
    const lineWidths: number[] = [];
    let currentX = 0;
    let currentLineY = 0;

    for (let i = 0; i < chars.length; i++) {
        const { char, color } = chars[i];
        const nextChar = chars[i + 1]?.char;

        if (char === '\r') continue;

        if (char === '\n') {
            lineWidths.push(currentX);
            currentX = 0;
            currentLineY += VERTICAL_SPACING;
            lineEntries.push([]);
            continue;
        }

        const glyph = glyphMap[char];
        if (!glyph) {
            currentX += glyphMap[" "]?.width || 6;
            continue;
        }

        lineEntries[lineEntries.length - 1].push({
            path: glyph.path, x: currentX, lineY: currentLineY, color, char,
        });

        let kerning = 0;
        if (nextChar && nextChar !== '\n' && nextChar !== '\r') {
            kerning = kerningTable[char + nextChar] || 0;
        }
        currentX += glyph.width + kerning;
    }
    lineWidths.push(currentX);

    // Superscript: positions relative to line start, after last char.
    const lastLineIdx = lineEntries.length - 1;
    const supGlyphs: SupGlyph[] = [];
    if (superscript) {
        let supX = lineWidths[lastLineIdx] + 2;
        for (const char of superscript) {
            const glyph = glyphMap[char];
            if (!glyph) continue;
            supGlyphs.push({ path: glyph.path, relX: supX });
            supX += glyph.width * SUP_SCALE;
        }
        lineWidths[lastLineIdx] = supX;
    }

    return {
        lineEntries,
        lineWidths,
        totalWidth: Math.max(...lineWidths, 0),
        totalHeight: currentLineY + BASE_FONT_SIZE,
        currentLineY,
        supGlyphs,
    };
}
