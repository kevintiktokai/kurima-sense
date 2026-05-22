#!/usr/bin/env node
/**
 * Generate minimal valid placeholder PDFs that read "Methodology coming soon."
 *
 * Produces three files under public/methodology/, each ~1 KB. The real
 * methodology PDFs will replace these later — for now we just need
 * something a 200-response can return.
 */

const fs = require("node:fs/promises");
const path = require("node:path");

const OUT_DIR = path.resolve(__dirname, "..", "public", "methodology");

const FILES = [
    { name: "buyers-methodology.pdf", title: "KurimaSense — Methodology" },
    { name: "lenders-methodology.pdf", title: "KurimaSense — Methodology" },
    { name: "insurers-methodology.pdf", title: "KurimaSense — Methodology" },
];

/**
 * Build a minimal single-page PDF with the given body text. Returns a
 * Buffer with a correctly-computed xref table.
 */
function buildPdf(bodyText) {
    const objects = [];
    objects.push("<< /Type /Catalog /Pages 2 0 R >>");
    objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    objects.push(
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    );
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");

    const stream =
        `BT\n/F1 24 Tf\n72 720 Td\n(${bodyText.replace(/[()\\]/g, "\\$&")}) Tj\nET\n`;
    objects.push(`<< /Length ${Buffer.byteLength(stream, "binary")} >>\nstream\n${stream}endstream`);

    const header = "%PDF-1.4\n";
    const offsets = [0]; // object 0 reserved
    let body = "";
    let cursor = Buffer.byteLength(header, "binary");

    objects.forEach((obj, i) => {
        const num = i + 1;
        offsets.push(cursor);
        const block = `${num} 0 obj\n${obj}\nendobj\n`;
        body += block;
        cursor += Buffer.byteLength(block, "binary");
    });

    const xrefOffset = cursor;
    let xref = `xref\n0 ${objects.length + 1}\n`;
    xref += "0000000000 65535 f \n";
    for (let i = 1; i <= objects.length; i++) {
        xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
    const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

    return Buffer.from(header + body + xref + trailer, "binary");
}

async function main() {
    await fs.mkdir(OUT_DIR, { recursive: true });
    for (const file of FILES) {
        const pdf = buildPdf("Methodology coming soon.");
        const out = path.join(OUT_DIR, file.name);
        await fs.writeFile(out, pdf);
        console.log(`  wrote ${path.relative(path.resolve(__dirname, ".."), out)} (${pdf.length} bytes)`);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
