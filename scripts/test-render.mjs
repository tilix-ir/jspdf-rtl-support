import fs from 'node:fs/promises';
import path from 'node:path';
import { jsPDF } from 'jspdf';
import { RtlRichTextPrinter } from '../dist/rtl-support.js';

async function main() {
  const doc = new jsPDF();

  // بارگذاری فونت‌ها
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
  doc.setFontSize(10);

  // تنظیمات چاپ
  const maxWidth = doc.internal.pageSize.width - 20;
  const lineHeight = 8;
  const firstAlignment = doc.internal.pageSize.width - 10;
  const marginTop = 15;
  const marginBottom = 15;
  const footerHeight = 15;
  const headerHeight = 15;

  // هدر و فوتر صفحه اول
  doc.setFontSize(10);
  doc.text(`صفحه ۱`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 5, { align: 'center' });
  doc.setFont('Vazir', 'bold');
  doc.setFontSize(12);
  doc.text('هدر تستی', doc.internal.pageSize.width / 2, 10, { align: 'center' });
  // doc.setR2L(true)
  let totalPage = 1;

  const printer = new RtlRichTextPrinter({
    doc,
    maxWidth,
    lineHeight,
    defaultStartX: firstAlignment,
    align: 'right',
    justify: true,
    marginTop,
    convertDigitsToPersian: true,
    marginBottom,
    footerHeight,
    headerHeight,
    fontName: 'Vazir',
    onPageBreak: () => {
      doc.setFont('Vazir', 'normal');
      totalPage += 1;

      // فوتر شماره صفحه
      doc.setFontSize(10);
      doc.text(`صفحه ${totalPage}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 5, { align: 'center' });

      // هدر ثابت
      doc.setFont('Vazir', 'bold');
      doc.setFontSize(12);
      doc.text('هدر تستی', doc.internal.pageSize.width / 2, 10, { align: 'center' });

      return marginTop + headerHeight;
    }
  });

  // متن نمونه طولانی با HTML
  const paragraph = `
  <u>تست این برای تست اندرلاین test است</u> اره درست میگه اینم <s>یک تست دیگر</s>
`;

  // تکرار 200 بار برای ایجاد 4 برابر متن قبلی
  let sampleText = '';
 

  // چاپ متن
  let finalY = printer.print(paragraph, { startY: marginTop + headerHeight });
finalY = printer.print(`این برای تست متن ترکیبی english و فارسی`, { startY: finalY });
finalY = printer.print(`تست برای تکست <b>قسمت بولد متن</b>`, { startY: finalY });
finalY = printer.print(`<b>این قسمت باید کاملا بولد باشه</b>`, { startY: finalY });
finalY = printer.print(`<b>این قسمت باید کاملا بولد باشه</b>`, { startY: finalY });
finalY = printer.print(Array(100).fill(1).map(() => `تست برای تکست <b>قسمت جاستیفای متن</b>`).join(''), { startY: finalY });

  // ایجاد پوشه خروجی و ذخیره PDF
  const outDir = path.resolve(process.cwd(), 'out');
  await fs.mkdir(outDir, { recursive: true });
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  const outPath = path.join(outDir, 'test_header_footer_long.pdf');
  await fs.writeFile(outPath, pdfBuffer);

  console.log(`Generated PDF at ${outPath} (finalY=${finalY})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
