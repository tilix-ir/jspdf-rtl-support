# jspdf-rtl-support

Utilities for printing rich Right-to-Left (RTL) text in `jsPDF`, including word wrapping, optional justification, and inline styles (bold, underline, strike-through). Ships JavaScript output with full TypeScript types.

## Installation

```bash
npm install jspdf jspdf-rtl-support
```

`jspdf` is a peer dependency. Install an RTL-capable font (e.g., Vazir) and register it on your `jsPDF` instance before printing.

## Quick Start

```ts
import jsPDF from 'jspdf';
import { RtlRichTextPrinter } from 'jspdf-rtl-support';

const doc = new jsPDF();
// doc.addFont('/path/to/Vazir.ttf', 'Vazir', 'normal');
// doc.setFont('Vazir', 'normal');

const renderer = new RtlRichTextPrinter({
  doc: doc,
  maxWidth: doc.internal.pageSize.width - 20,
  lineHeight: 10,
  fontName: 'Vazir',
  align: 'right',
  justify: true,
  marginTop: 10,
  marginBottom: 10,
  headerHeight: 0,
  footerHeight: 0,
});

const y = renderer.print(
  'سلام <b>دنیا</b> — نمونه متن با <u>زیرخط</u> و <s>خط روی متن</s>.<br/>This is <ltr>LTR content 123</ltr> inside RTL.',
  { startY: 20 }
);

doc.save('example.pdf');
```

## API

### RtlRichTextPrinter
- Creates an RTL-aware printer bound to a `jsPDF` document.

### Constructor Config (`RtlPrinterConfig`)
- `doc`: `jsPDF` instance.
- `maxWidth`: maximum printable line width.
- `lineHeight`: line spacing in document units.
- `defaultStartX?`: starting X for lines; defaults to `pageWidth - 10`.
- `align?`: `'right' | 'center' | 'left'` for non-justified lines. Default `'right'`.
- `justify?`: whether to justify full lines. Default `true`.
- `marginTop?`, `marginBottom?`: page break margins.
- `footerHeight?`, `headerHeight?`: reserved areas at bottom/top.
- `onPageBreak?`: `(pageNumber) => number` callback; return new Y after page break.
- `fontName`: name of a font you have added via `doc.addFont`.
- `convertDigitsToPersian?`: convert `0-9` to Persian digits. Default `true`.

### Printing Options (`PrintOptions`)
- `startX?`: overrides `defaultStartX`.
- `startY`: starting baseline Y.
- `justify?`: overrides constructor `justify` per call.

### Rich Text Markup
- `<b>...</b>` bold
- `<u>...</u>` underline
- `<s>...</s>` strike-through
- `<ltr>...</ltr>` force LTR block inside RTL context
- `<br/>` line break

Neutral and Latin words are auto-detected and treated as LTR when appropriate. Parentheses are normalized for RTL rendering.

## How It Works
- Preprocesses text: converts digits, normalizes parentheses, replaces HTML tags with internal markers, auto-wraps LTR blocks.
- Tokenizes into words and measures with `doc.getTextWidth`.
- Performs word wrapping against `maxWidth`.
- Renders lines with either standard spacing or RTL-friendly justification.
- Applies inline styles while printing segments and draws underline/strike lines.
- Handles page breaks using margins, header/footer, and optional `onPageBreak` callback.

## Notes
- Ensure the chosen RTL font is loaded and selected on `jsPDF` before printing.
- `jspdf-rtl-support` does not bundle fonts or `jsPDF`.

## Attribution
Created by tilix-coders — https://tilix.ir
## Loading Persian/Arabic Fonts

Place your fonts under `assets/` (e.g., `assets/Vazir-Medium.ttf`, `assets/Vazir-Bold.ttf`). Then load and register them with `jsPDF`:

```ts
import { jsPDF } from 'jspdf';
import fs from 'node:fs/promises';
import path from 'node:path';

const doc = new jsPDF();

const fontBuffer = await fs.readFile(path.resolve(process.cwd(), 'assets', 'Vazir-Medium.ttf'));
const fontBufferBold = await fs.readFile(path.resolve(process.cwd(), 'assets', 'Vazir-Bold.ttf'));
const fontBase64 = fontBuffer.toString('base64');
const fontBase64Bold = fontBufferBold.toString('base64');

doc.addFileToVFS('Vazir-Medium.ttf', fontBase64);
doc.addFileToVFS('Vazir-Bold.ttf', fontBase64Bold);
doc.addFont('Vazir-Medium.ttf', 'Vazir', 'normal');
doc.addFont('Vazir-Bold.ttf', 'Vazir', 'bold');
doc.setLanguage('fa-IR');
doc.setFont('Vazir', 'normal');
```

Use `'Vazir'` as `fontName` in `RichTextPdfRenderer`.

## Test Script

- Run `npm run build` then `npm run test:render`.
- Output PDF is saved to `out/test.pdf` demonstrating mixed RTL/LTR text, bold, underline, and strike-through.