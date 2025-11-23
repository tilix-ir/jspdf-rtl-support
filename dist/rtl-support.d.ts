/**
 * ==============================================================================
 * RTLRichTextPrinter.ts - نسخه نهایی اصلاح خطوط پیوسته
 *
 * FIX: Optimized line drawing in renderWord to ensure continuous Underline/Strikethrough
 * by applying a minor overlap at segment joints.
 * FIX: Strikethrough (S tag) vertical placement adjusted to be on the word.
 * FIX: Underline (U tag) vertical placement adjusted to be on the word (like S tag).
 * ==============================================================================
 */
import jsPDF from "jspdf";
interface RtlPrinterConfig {
    doc: jsPDF;
    maxWidth: number;
    lineHeight: number;
    defaultStartX?: number;
    align?: 'right' | 'center' | 'left';
    justify?: boolean;
    marginTop?: number;
    marginBottom?: number;
    footerHeight?: number;
    headerHeight?: number;
    onPageBreak?: (pageNumber: number) => number;
    fontName: string;
    convertDigitsToPersian?: boolean;
    underlineOffsetRatio?: number;
    strikeOffsetRatio?: number;
}
interface PrintOptions {
    startX?: number;
    startY: number;
    justify?: boolean;
}
export declare class RtlRichTextPrinter {
    private static readonly MARKERS;
    private static readonly SPACE_CHAR;
    private readonly doc;
    private readonly maxWidth;
    private readonly lineHeight;
    private readonly defaultStartX;
    private readonly align;
    private readonly justify;
    private readonly marginTop;
    private readonly marginBottom;
    private readonly footerHeight;
    private readonly headerHeight;
    private readonly pageHeight;
    private readonly onPageBreak?;
    private readonly fontName;
    private readonly convertDigitsToPersian;
    private pageCounter;
    private readonly underlineOffsetRatio;
    private readonly strikeOffsetRatio;
    constructor(config: RtlPrinterConfig);
    getDoc(): jsPDF;
    getTextWidth(text: string): number;
    getFontSize(): number;
    setFont(name: string, style: 'normal' | 'bold' | 'italic' | 'bolditalic'): void;
    setFontSize(size: number): void;
    getPageWidth(): number;
    getPageHeight(): number;
    print(text: string, options: PrintOptions): number;
    private preprocessText;
    private tokenize;
    private renderWords;
    private getWordWidthWithState;
    private renderLine;
    private renderJustifiedLine;
    private renderRegularLine;
    /**
     * Renders a single word, handling rich text segments (bold, underline, strike, LTR).
     * Applies an overlap to segment decorations to ensure continuity.
     * @param word - The word string, potentially containing markers.
     * @param x - The X-coordinate for the right edge of the word.
     * @param y - The Y-coordinate for the baseline.
     * @returns The new X-coordinate after printing the word.
     */
    private renderWordWithState;
    private parseSegmentsWithState;
    private stripMarkers;
    private checkPageBreak;
    private toPersianDigits;
}
export {};
