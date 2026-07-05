import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type PdfSection = { heading?: string; lines: string[] };

// Generic single-column document generator (invoices, reports, equipment sheets later)
// so every future module produces PDFs the same way instead of each rolling its own.
export async function generateSimplePdf(title: string, sections: PdfSection[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage();
  const { height, width } = page.getSize();
  const margin = 50;
  let y = height - margin;

  const ensureSpace = (needed: number) => {
    if (y - needed < margin) {
      page = pdf.addPage();
      y = height - margin;
    }
  };

  page.drawText(title, { x: margin, y, size: 18, font: boldFont, color: rgb(0, 0, 0) });
  y -= 30;

  for (const section of sections) {
    if (section.heading) {
      ensureSpace(24);
      page.drawText(section.heading, { x: margin, y, size: 13, font: boldFont });
      y -= 20;
    }
    for (const line of section.lines) {
      ensureSpace(16);
      page.drawText(line, { x: margin, y, size: 11, font, maxWidth: width - margin * 2 });
      y -= 16;
    }
    y -= 10;
  }

  return pdf.save();
}
