# jspdf-rtl-support Guide

## Overview
- Provides RTL-aware rich text rendering for `jsPDF` with word wrapping, optional justification, and inline styles (bold, underline, strike-through).
- Key component: `RtlRichTextPrinter`.

## Header/Footer Implementation
- Reserve header/footer areas via `headerHeight` and `footerHeight`.
- Provide `onPageBreak(pageNumber)` to draw header/footer per page and return new `startY`.
- Page breaks occur when the next line would exceed `pageHeight - footerHeight - marginBottom`.

## Components and Interactions
- `RtlRichTextPrinter` orchestrates preprocessing, tokenization, layout, and rendering.
- Preprocess replaces HTML-like tags (`<b>`, `<u>`, `<s>`, `<ltr>`) with internal markers and normalizes parentheses for RTL.
- Tokenization splits by space, measuring each word with its active styles.
- Lines render using either regular spacing or RTL-friendly justification.
- Decorations draw continuously across styled segments and spaces within tag scope.

## Usage
- Load an RTL-capable font and set it on `jsPDF`.
- Construct `RtlRichTextPrinter` with layout and style options.
- Call `print(text, { startY, startX?, justify? })` to render paragraphs; returns final Y.

### Example
```ts
import jsPDF from 'jspdf';
import { RtlRichTextPrinter } from 'jspdf-rtl-support';

const doc = new jsPDF();
// load and set fonts here ...
const printer = new RtlRichTextPrinter({
  doc,
  maxWidth: doc.internal.pageSize.width - 20,
  lineHeight: 10,
  fontName: 'Vazir',
  align: 'right',
  justify: true,
  marginTop: 10,
  marginBottom: 10,
  headerHeight: 0,
  footerHeight: 0,
  underlineOffsetRatio: 0.18,
  strikeOffsetRatio: 0.1,
  convertDigitsToPersian: true,
});

const y = printer.print('سلام <b>دنیا</b> با <u>زیرخط</u> و <s>خط روی متن</s>.', { startY: 20 });
doc.save('example.pdf');
```

## API Reference (Summary)
- `RtlRichTextPrinter(config)`
  - `doc`: `jsPDF` instance
  - `maxWidth`, `lineHeight`, `defaultStartX?`, `align?`, `justify?`
  - `marginTop?`, `marginBottom?`, `headerHeight?`, `footerHeight?`
  - `onPageBreak?`: `(pageNumber) => number`
  - `fontName`: name used with `doc.addFont`
  - `convertDigitsToPersian?`: default `true`
  - `underlineOffsetRatio?`: default `0.18`
  - `strikeOffsetRatio?`: default `0.1`
- `print(text, { startY, startX?, justify? }) => number`

## Platforms
- Browser: bundle `jspdf` and this library; ensure fonts are added via `addFileToVFS` and `addFont`.
- Node: generate PDFs using `jsPDF` in Node with font files loaded from disk.

## Installation
```bash
npm install jspdf jspdf-rtl-support
```

## Tips
- Ensure `doc.setFont('YourFont', 'normal')` before printing.
- Use `<ltr>...</ltr>` for embedded Latin text.
- Adjust `underlineOffsetRatio` and `strikeOffsetRatio` to match font metrics.

