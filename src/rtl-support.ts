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

interface TextSegment {
    text: string;
    isBold: boolean;
    isUnderline: boolean;
    isStrike: boolean;
    isLtr: boolean;
}

type StyleState = {
    isBold: boolean;
    isUnderline: boolean;
    isStrike: boolean;
    isLtr: boolean;
};

// ---------------------------------------------------

export class RtlRichTextPrinter {
    private static readonly MARKERS = {
        BOLD_START: '\uE000',
        BOLD_END: '\uE001',
        UNDERLINE_START: '\uE004',
        UNDERLINE_END: '\uE005',
        STRIKE_START: '\uE006',
        STRIKE_END: '\uE007',
        LTR_START: '\uE008',
        LTR_END: '\uE009',
    };

    private static readonly SPACE_CHAR = ' ';

    private readonly doc: jsPDF;
    private readonly maxWidth: number;
    private readonly lineHeight: number;
    private readonly defaultStartX: number;
    private readonly align: 'right' | 'center' | 'left';
    private readonly justify: boolean;
    private readonly marginTop: number;
    private readonly marginBottom: number;
    private readonly footerHeight: number;
    private readonly headerHeight: number;
    private readonly pageHeight: number;
    private readonly onPageBreak?: (pageNumber: number) => number;
    private readonly fontName: string;
    private readonly convertDigitsToPersian: boolean;
    private pageCounter: number = 1;
    private readonly underlineOffsetRatio: number;
    private readonly strikeOffsetRatio: number;

    constructor(config: RtlPrinterConfig) {
        this.doc = config.doc;
        // Setting a small buffer for the max width
        this.maxWidth = config.maxWidth - 5; 
        this.lineHeight = config.lineHeight;
        this.defaultStartX = config.defaultStartX ?? this.doc.internal.pageSize.width - 10;
        this.align = config.align ?? 'right';
        this.justify = config.justify ?? true;
        this.marginTop = config.marginTop ?? 10;
        this.marginBottom = config.marginBottom ?? 10;
        this.footerHeight = config.footerHeight ?? 0;
        this.headerHeight = config.headerHeight ?? 0;
        this.pageHeight = this.doc.internal.pageSize.height;
        this.onPageBreak = config.onPageBreak;
        this.fontName = config.fontName;
        this.convertDigitsToPersian = config.convertDigitsToPersian ?? true;
        this.pageCounter = 1;
        this.underlineOffsetRatio = config.underlineOffsetRatio ?? 0.18;
        this.strikeOffsetRatio = config.strikeOffsetRatio ?? 0.1;
    }

    public getDoc(): jsPDF {
        return this.doc;
    }

    public getTextWidth(text: string): number {
        const processed = this.preprocessText(text);
        const paragraphs = processed.split('\n');
        const spaceWidth = this.doc.getTextWidth(RtlRichTextPrinter.SPACE_CHAR);

        let maxWidth = 0;
        for (const paragraph of paragraphs) {
            if (!paragraph.trim()) continue;
            const words = this.tokenize(paragraph);
            let state: StyleState = { isBold: false, isUnderline: false, isStrike: false, isLtr: false };
            let width = 0;
            for (let i = 0; i < words.length; i++) {
                const { width: w, state: nextState } = this.getWordWidthWithState(words[i], state);
                width += w;
                state = nextState;
                if (i < words.length - 1) width += spaceWidth;
            }
            if (width > maxWidth) maxWidth = width;
        }
        return maxWidth;
    }

    public getFontSize(): number {
        return this.doc.getFontSize();
    }

    public setFont(name: string, style: 'normal' | 'bold' | 'italic' | 'bolditalic'): void {
        this.doc.setFont(name, style);
    }

    public setFontSize(size: number): void {
        this.doc.setFontSize(size);
    }

    public getPageWidth(): number {
        return this.doc.internal.pageSize.width;
    }

    public getPageHeight(): number {
        return this.doc.internal.pageSize.height;
    }

    public print(text: string, options: PrintOptions): number {
        const startX = options.startX ?? this.defaultStartX;
        const shouldJustify = options.justify ?? this.justify;

        const processedText = this.preprocessText(text);
        // Split by newline to handle paragraphs
        const paragraphs = processedText.split('\n'); 

        let currentY = options.startY;

        for (const paragraph of paragraphs) {
            if (!paragraph.trim()) {
                currentY += this.lineHeight;
                continue;
            }

            const words = this.tokenize(paragraph);
            currentY = this.renderWords(words, startX, currentY, shouldJustify);
        }

        return currentY;
    }

    private preprocessText(text: string): string {
        let processed = text;


        processed = processed.replace(/<br\s*\/?>/gi, '\n');

        const styles = [
            { regex: /<(b|strong)>(.*?)<\/\1>/gi, start: RtlRichTextPrinter.MARKERS.BOLD_START, end: RtlRichTextPrinter.MARKERS.BOLD_END },
            { regex: /<(u|ins)>(.*?)<\/\1>/gi, start: RtlRichTextPrinter.MARKERS.UNDERLINE_START, end: RtlRichTextPrinter.MARKERS.UNDERLINE_END },
            // Includes <s>, <strike>, and <del> for strikethrough
            { regex: /<(s|strike|del)>(.*?)<\/\1>/gi, start: RtlRichTextPrinter.MARKERS.STRIKE_START, end: RtlRichTextPrinter.MARKERS.STRIKE_END },
            { regex: /<(ltr)>(.*?)<\/\1>/gi, start: RtlRichTextPrinter.MARKERS.LTR_START, end: RtlRichTextPrinter.MARKERS.LTR_END },
        ];

        styles.forEach(style => {
            let previous = '';
            // Loop replacement to handle nested/overlapping tags (though overlapping is discouraged)
            while (processed !== previous) {
                previous = processed;
                processed = processed.replace(style.regex, `${style.start}$2${style.end}`);
            }
        });

        // Regex to wrap English words/blocks in LTR markers for proper isolation
        const ltrBlockRegex = /([A-Za-z]+[A-Za-z0-9\s.,:;?!'"()\[\]{}&*-]*)/g;

        processed = processed.replace(ltrBlockRegex, (match) => {
            // Avoid wrapping if it's already inside an LTR block
            if (match.includes(RtlRichTextPrinter.MARKERS.LTR_START) || match.includes(RtlRichTextPrinter.MARKERS.LTR_END)) {
                return match;
            }
            return `${RtlRichTextPrinter.MARKERS.LTR_START}${match}${RtlRichTextPrinter.MARKERS.LTR_END}`;
        });

        // Remove any remaining HTML tags
        processed = processed.replace(/<[^>]+>/g, '');

        // Fix parenthesis direction (standard for RTL context)
        processed = processed
            .replace(/\(/g, '__TEMP_OPEN__')
            .replace(/\)/g, '(')
            .replace(/__TEMP_OPEN__/g, ')');

        return processed;
    }


    private tokenize(text: string): string[] {
        // Tokenize by space
        return text.split(RtlRichTextPrinter.SPACE_CHAR).filter(w => w !== '');
    }

    private renderWords(words: string[], startX: number, startY: number, justify: boolean): number {
        let y = startY;
        let lineWords: string[] = [];
        let lineWidth = 0;
        const spaceWidth = this.doc.getTextWidth(RtlRichTextPrinter.SPACE_CHAR);

        let state: StyleState = { isBold: false, isUnderline: false, isStrike: false, isLtr: false };
        let lineStartingState: StyleState = { ...state };

        for (const word of words) {
            const spaceToUse = lineWords.length > 0 ? spaceWidth : 0;
            const { width: wordWidth, state: nextState } = this.getWordWidthWithState(word, state);

            if (lineWidth + wordWidth + spaceToUse > this.maxWidth) {
                y = this.checkPageBreak(y);
                this.renderLine(lineWords, startX, y, justify && lineWords.length > 1, lineStartingState);
                y += this.lineHeight;

                lineWords = [word];
                lineWidth = wordWidth;
                lineStartingState = { ...state };
                state = nextState;
            } else {
                lineWords.push(word);
                lineWidth += wordWidth + spaceToUse;
                state = nextState;
            }
        }

        if (lineWords.length > 0) {
            y = this.checkPageBreak(y);
            this.renderLine(lineWords, startX, y, false, lineStartingState);
            y += this.lineHeight;
        }

        return y;
    }

    private getWordWidthWithState(word: string, state: StyleState): { width: number; state: StyleState } {
        const { segments, state: nextState } = this.parseSegmentsWithState(word, { ...state });
        let width = 0;
        const currentFont = this.doc.getFont();
        for (const segment of segments) {
            this.doc.setFont(this.fontName, segment.isBold ? 'bold' : 'normal');
            const textForMeasure = (this.convertDigitsToPersian && !segment.isLtr)
                ? this.toPersianDigits(segment.text)
                : segment.text;
            width += this.doc.getTextWidth(textForMeasure);
        }
        this.doc.setFont(currentFont.fontName, currentFont.fontStyle);
        return { width, state: nextState };
    }

    private renderLine(words: string[], startX: number, y: number, shouldJustify: boolean, initialState: StyleState): void {
        if (shouldJustify && this.align === 'right') {
            this.renderJustifiedLine(words, startX, y, initialState);
        } else {
            this.renderRegularLine(words, startX, y, initialState);
        }
    }

   private renderJustifiedLine(words: string[], startX: number, y: number, initialState: StyleState): void {
    let s: StyleState = { ...initialState };
    const totalWordsWidth = words.reduce((sum, w) => {
        const r = this.getWordWidthWithState(w, s);
        s = r.state;
        return sum + r.width;
    }, 0);
    const spacesCount = words.length - 1;

    if (spacesCount <= 0) {
        this.renderRegularLine(words, startX, y, initialState);
        return;
    }

    const spaceWidth = this.doc.getTextWidth(RtlRichTextPrinter.SPACE_CHAR);
    const extraSpacePerGap = (this.maxWidth - totalWordsWidth - spaceWidth * spacesCount) / spacesCount;

    let currentX = startX;
        let state: StyleState = { ...initialState };
        const fontSize = this.doc.getFontSize();

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const r = this.renderWordWithState(word, currentX, y, state);
        currentX = r.x;
        state = r.state;

        if (i < words.length - 1) {
            const gapWidth = spaceWidth + extraSpacePerGap;
            const rightX = currentX;
            const leftX = currentX - gapWidth;
            const underlineY = y + (fontSize * this.underlineOffsetRatio);
            const strikeY = y - (fontSize * this.strikeOffsetRatio);
            if (state.isUnderline) {
                this.doc.line(rightX, underlineY, leftX, underlineY);
            }
            if (state.isStrike) {
                this.doc.line(rightX, strikeY, leftX, strikeY);
            }
            currentX -= gapWidth;
        }
    }
}

    private renderRegularLine(words: string[], startX: number, y: number, initialState: StyleState): void {
        let currentX = startX;
        const spaceWidth = this.doc.getTextWidth(RtlRichTextPrinter.SPACE_CHAR);
        let alignmentOffset = 0;

        // Calculate offset if not right-aligned
        if (this.align !== 'right') {
            let s2: StyleState = { ...initialState };
            const lineLength = words.reduce((sum, w) => {
                const r = this.getWordWidthWithState(w, s2);
                s2 = r.state;
                return sum + r.width;
            }, 0) +
                (words.length - 1) * spaceWidth;
            const remainingWidth = this.maxWidth - lineLength;

            if (this.align === 'left') {
                // In RTL, "left" alignment means the line starts at the right (startX) and ends at the left-most edge
                // So, we shift the entire line by the remaining width to the left.
                alignmentOffset = remainingWidth; 
            } else if (this.align === 'center') {
                alignmentOffset = remainingWidth / 2;
            }
        }

        // Apply alignment offset (shifts the starting point)
        currentX -= alignmentOffset;

        let state: StyleState = { ...initialState };
        const fontSize = this.doc.getFontSize();

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const r = this.renderWordWithState(word, currentX, y, state);
            currentX = r.x;
            state = r.state;

            if (i < words.length - 1) {
                const rightX = currentX;
                const leftX = currentX - spaceWidth;
                const underlineY = y + (fontSize * this.underlineOffsetRatio);
                const strikeY = y - (fontSize * this.strikeOffsetRatio);
                if (state.isUnderline) {
                    this.doc.setDrawColor(0, 0, 0);
                    this.doc.line(rightX, underlineY, leftX, underlineY);
                }
                if (state.isStrike) {
                    this.doc.setDrawColor(0, 0, 0);
                    this.doc.line(rightX, strikeY, leftX, strikeY);
                }
                currentX -= spaceWidth;
            }
        }
    }

    /**
     * Renders a single word, handling rich text segments (bold, underline, strike, LTR).
     * Applies an overlap to segment decorations to ensure continuity.
     * @param word - The word string, potentially containing markers.
     * @param x - The X-coordinate for the right edge of the word.
     * @param y - The Y-coordinate for the baseline.
     * @returns The new X-coordinate after printing the word.
     */
    private renderWordWithState(word: string, x: number, y: number, state: StyleState): { x: number; state: StyleState } {
        const { segments, state: nextState } = this.parseSegmentsWithState(word, { ...state });
        let currentX = x;

        const fontSize = this.doc.getFontSize();
        const overlap = 0.3;

        this.doc.setLineWidth(0.15);

        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];

            if (segment.text) {
                const hasPersianChar = /[\u0600-\u06FF]/.test(segment.text);
                const isRtlOutput = !segment.isLtr && hasPersianChar;

                const fontStyle = segment.isBold ? 'bold' : 'normal';
                const currentFont = this.doc.getFont();

                this.doc.setFont(this.fontName, fontStyle);
                const printableText = (this.convertDigitsToPersian && !segment.isLtr)
                    ? this.toPersianDigits(segment.text)
                    : segment.text;
                const segmentWidth = this.doc.getTextWidth(printableText);

                // 1. چاپ متن
                this.doc.text(printableText, currentX, y, {
                    align: 'right',
                    isOutputRtl: isRtlOutput
                });

                // 2. محاسبه مختصات X برای دکوراسیون و اعمال همپوشانی
                let rightX = currentX;
                let leftX = currentX - segmentWidth;
                
                // If the current segment has a decoration
                if (segment.isUnderline || segment.isStrike) {

                    // Apply overlap on the RIGHT side (start of the decoration line in RTL)
                    const prevSegment = i > 0 ? segments[i - 1] : null;
                    if (prevSegment && (prevSegment.isUnderline || prevSegment.isStrike)) {
                        rightX += overlap;
                    }

                    // Apply overlap on the LEFT side (end of the decoration line in RTL)
                    const nextSegment = i < segments.length - 1 ? segments[i + 1] : null;
                    if (nextSegment && (nextSegment.isUnderline || nextSegment.isStrike)) {
                        leftX -= overlap;
                    }
                    
                    this.doc.setLineDashPattern([0], 0);
                    this.doc.setDrawColor(0, 0, 0);

                    const underlineY = y + (fontSize * this.underlineOffsetRatio);
                    const strikeY = y - (fontSize * this.strikeOffsetRatio);

                    if (segment.isUnderline) {
                        this.doc.line(rightX, underlineY, leftX, underlineY);
                    }

                    if (segment.isStrike) {
                        this.doc.line(rightX, strikeY, leftX, strikeY);
                    }
                }

                // 3. حرکت کرسر
                currentX -= segmentWidth;

                // Reset font after measurement
                this.doc.setFont(currentFont.fontName, currentFont.fontStyle);
            }
        }

        // Final font reset to ensure next word starts correctly
        this.doc.setFont(this.fontName, 'normal');

        return { x: currentX, state: nextState };
    }

    private parseSegmentsWithState(word: string, state: StyleState): { segments: TextSegment[]; state: StyleState } {
        const regex = new RegExp(`(${Object.values(RtlRichTextPrinter.MARKERS).join('|')})`);
        const parts = word.split(regex);
        const segments: TextSegment[] = [];

        for (const part of parts) {
            switch (part) {
                case RtlRichTextPrinter.MARKERS.BOLD_START: state.isBold = true; break;
                case RtlRichTextPrinter.MARKERS.BOLD_END: state.isBold = false; break;
                case RtlRichTextPrinter.MARKERS.UNDERLINE_START: state.isUnderline = true; break;
                case RtlRichTextPrinter.MARKERS.UNDERLINE_END: state.isUnderline = false; break;
                case RtlRichTextPrinter.MARKERS.STRIKE_START: state.isStrike = true; break;
                case RtlRichTextPrinter.MARKERS.STRIKE_END: state.isStrike = false; break;
                case RtlRichTextPrinter.MARKERS.LTR_START: state.isLtr = true; break;
                case RtlRichTextPrinter.MARKERS.LTR_END: state.isLtr = false; break;
                default:
                    if (part) {
                        segments.push({ text: part, isBold: state.isBold, isUnderline: state.isUnderline, isStrike: state.isStrike, isLtr: state.isLtr });
                    }
            }
        }
        return { segments, state };
    }

    private stripMarkers(text: string): string {
        const regex = new RegExp(`(${Object.values(RtlRichTextPrinter.MARKERS).join('|')})`, 'g');
        return text.replace(regex, '');
    }

    private checkPageBreak(y: number): number {
        const threshold = this.pageHeight - this.footerHeight - this.marginBottom;

        if (y + this.lineHeight + 2 > threshold) {
            this.doc.addPage();
            this.pageCounter++;

            // Call optional callback for custom page header/footer
            if (this.onPageBreak) return this.onPageBreak(this.pageCounter);

            // Default Y position after page break
            return this.marginTop + this.headerHeight;
        }
        return y;
    }

    private toPersianDigits(text: string): string {
        const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return text.replace(/\d/g, digit => persianDigits[parseInt(digit)]);
    }
}
