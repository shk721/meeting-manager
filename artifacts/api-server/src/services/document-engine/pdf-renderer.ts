import { chromium } from "playwright";
import fs from "fs/promises";
import path from "path";

const DOCS_DIR = "/tmp/docs";

async function ensureDocsDir(): Promise<void> {
  await fs.mkdir(DOCS_DIR, { recursive: true });
}

export async function renderHtmlToPdf(html: string, filename: string): Promise<{ buffer: Buffer; filePath: string }> {
  await ensureDocsDir();

  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const buffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    await browser.close();

    const filePath = path.join(DOCS_DIR, filename);
    await fs.writeFile(filePath, buffer);
    return { buffer: Buffer.from(buffer), filePath };
  } catch (err) {
    await browser.close();
    throw err;
  }
}
