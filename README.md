# jspdf-rtl-support

Utilities for printing rich Right-to-Left (RTL) text in `jsPDF`, including word wrapping, optional justification, and inline styles (bold, underline, strike-through). Ships JavaScript output with full TypeScript types. Supports both ESM and CommonJS consumers.

## Installation

```bash
npm install jspdf jspdf-rtl-support
```

`jspdf` is a peer dependency. Install an RTL-capable font (e.g., Vazir) and register it on your `jsPDF` instance before printing.

ESM usage:

```ts
import jsPDF from 'jspdf';
import { RtlRichTextPrinter } from 'jspdf-rtl-support';
```

CommonJS usage:

```js
const { RtlRichTextPrinter } = require('jspdf-rtl-support');
const jsPDF = require('jspdf').default;
```

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
  underlineOffsetRatio: 0.18,
  strikeOffsetRatio: 0.1,
  convertDigitsToPersian: true,
});

const y = renderer.print(
  'سلام <b>دنیا پررنگ</b> — نمونه متن با <u>زیرخط چند کلمه‌ای</u> و <s>خط روی متن</s>.<br/>This is <ltr>LTR content 123</ltr> mixed.',
  { startY: 20 }
);

doc.save('example.pdf');
```

## API

### RtlRichTextPrinter
- Creates an RTL-aware printer bound to a `jsPDF` document.

#### Doc Proxy Methods
- `getDoc()` returns the bound `jsPDF` instance.
- `getTextWidth(text)` returns measured width honoring rich-text markup (bold/underline/strike, LTR segments, digit conversion for RTL) across segments and spaces.
- `getFontSize()` returns current font size.
- `setFont(name, style)` sets current font.
- `setFontSize(size)` sets current font size.
- `getPageWidth()` returns page width.
- `getPageHeight()` returns page height.

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
- `convertDigitsToPersian?`: convert `0-9` to Persian digits for RTL segments during rendering. Default `true`.
- `underlineOffsetRatio?`: underline distance below baseline relative to font size. Default `0.18`.
- `strikeOffsetRatio?`: strikethrough distance above baseline relative to font size. Default `0.1`.

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

Decoration lines are solid black and drawn continuously across styled segments and the spaces between them while the tag scope is active.

## How It Works
- Preprocesses text: normalizes parentheses, replaces HTML tags with internal markers, and auto-wraps LTR blocks.
- Tokenizes into words; measures each word with active styles.
- Performs word wrapping against `maxWidth`; supports RTL-friendly justification.
- Converts digits to Persian only for RTL segments during measurement and rendering (keeps ASCII digits inside LTR blocks).
- Applies inline styles while printing segments and draws underline/strike lines continuously across segments and spaces.
- Handles page breaks using margins, header/footer, and optional `onPageBreak` callback.

## Notes
- Ensure the chosen RTL font is loaded and selected on `jsPDF` before printing.
- `jspdf-rtl-support` does not bundle fonts or `jsPDF`.
- For CommonJS apps, require the package (`require('jspdf-rtl-support')`) and access `jspdf` via `require('jspdf').default`.


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
- Output PDF is saved to `out/test_header_footer_long.pdf` demonstrating mixed RTL/LTR text, bold across multiple words, underline/strike continuity, justification, and header/footer.

## Advanced Example (Header/Footer and Justification)

```ts
import { jsPDF } from 'jspdf';
import { RtlRichTextPrinter } from 'jspdf-rtl-support';

const doc = new jsPDF();
// load fonts here ...
doc.setFont('Vazir', 'normal');
doc.setLanguage('fa-IR');

const maxWidth = doc.internal.pageSize.width - 20;
const lineHeight = 8;
const marginTop = 15;
const marginBottom = 15;
const headerHeight = 15;
const footerHeight = 15;

const printer = new RtlRichTextPrinter({
  doc,
  maxWidth,
  lineHeight,
  defaultStartX: doc.internal.pageSize.width - 10,
  align: 'right',
  justify: true,
  marginTop,
  marginBottom,
  headerHeight,
  footerHeight,
  fontName: 'Vazir',
  underlineOffsetRatio: 0.18,
  strikeOffsetRatio: 0.1,
  convertDigitsToPersian: true,
  onPageBreak: (pageNum) => {
    doc.setFont('Vazir', 'normal');
    doc.setFontSize(10);
    doc.text(`صفحه ${pageNum}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 5, { align: 'center' });
    doc.setFont('Vazir', 'bold');
    doc.setFontSize(12);
    doc.text('هدر تستی', doc.internal.pageSize.width / 2, 10, { align: 'center' });
    return marginTop + headerHeight;
  },
});

let y = printer.print('<u>زیرخط پیوسته چند کلمه‌ای</u> و <b>پررنگ چند کلمه‌ای</b>', { startY: marginTop + headerHeight });
y = printer.print('متن ترکیبی با <ltr>English and 123</ltr> و اعداد فارسی', { startY: y });
```
