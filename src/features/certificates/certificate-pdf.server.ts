import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface CertificatePdfInput {
  candidateName: string;
  certificateNumber: string;
  program: string;
  issuedAt: Date;
  scorePercent: number | null;
  issuerName: string | null;
  verifyUrl: string | null;
}

/** A4 landscape certificate; every field comes from the saved certificate record. */
export async function renderCertificatePdf(p: CertificatePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Certificate ${p.certificateNumber}`);
  doc.setAuthor("E2E Procurement Pvt Ltd");
  const page = doc.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const sansBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.09, 0.13, 0.2);
  const muted = rgb(0.38, 0.42, 0.48);
  const accent = rgb(0.12, 0.29, 0.49);

  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: accent,
    borderWidth: 2,
  });
  page.drawRectangle({
    x: 32,
    y: 32,
    width: width - 64,
    height: height - 64,
    borderColor: accent,
    borderWidth: 0.5,
  });

  const center = (text: string, y: number, font = sans, size = 12, color = ink) => {
    const safe = text.replace(/[^\x20-\x7E]/g, "-");
    const w = font.widthOfTextAtSize(safe, size);
    page.drawText(safe, { x: (width - w) / 2, y, size, font, color });
  };

  center("E2E PROCUREMENT PVT LTD", height - 90, sansBold, 13, accent);
  center("Recruiter Academy", height - 108, sans, 10, muted);
  center("Certificate of Completion", height - 170, serifBold, 38);
  center("This is to certify that", height - 215, serif, 14, muted);
  let nameSize = 30;
  while (serifBold.widthOfTextAtSize(p.candidateName, nameSize) > width - 160 && nameSize > 16)
    nameSize--;
  center(p.candidateName, height - 262, serifBold, nameSize);
  page.drawLine({
    start: { x: width / 2 - 180, y: height - 274 },
    end: { x: width / 2 + 180, y: height - 274 },
    thickness: 0.6,
    color: muted,
  });
  center("has successfully completed the", height - 305, serif, 14, muted);
  center(p.program, height - 335, serifBold, 20, accent);
  const scoreLine =
    p.scorePercent != null
      ? `including all five Academy modules and the Final Assessment (score ${Math.round(p.scorePercent)}%).`
      : "including all five Academy modules and the Final Assessment.";
  center(scoreLine, height - 362, serif, 12, muted);

  const issued = p.issuedAt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  const col = (label: string, value: string, x: number) => {
    page.drawText(label.toUpperCase(), { x, y: 120, size: 8, font: sansBold, color: muted });
    page.drawText(value.replace(/[^\x20-\x7E]/g, "-"), {
      x,
      y: 104,
      size: 11,
      font: sans,
      color: ink,
    });
  };
  col("Certificate ID", p.certificateNumber, 80);
  col("Issue date", issued, 330);
  col(
    "Issued by",
    p.issuerName ? `${p.issuerName}, E2E Procurement Pvt Ltd` : "E2E Procurement Pvt Ltd",
    520,
  );

  const verify = p.verifyUrl
    ? `Verify this certificate at ${p.verifyUrl}`
    : `Verify this certificate with E2E Procurement Pvt Ltd using the Certificate ID.`;
  center(verify, 62, sans, 8.5, muted);
  return doc.save();
}
