import { chromium } from "playwright";
import fs from "fs/promises";
import path from "path";

const DOCS_DIR = "/tmp/docs";

async function ensureDocsDir(): Promise<void> {
  await fs.mkdir(DOCS_DIR, { recursive: true });
}

export async function renderHtmlToPdf(html: string, filename: string): Promise<{ buffer: Buffer; filePath: string }> {
  await ensureDocsDir();

  // Dev (Claude Code remote): PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 is set → binary at /opt/pw-browsers/chromium
  // Production (Railway): pnpm install triggers playwright's own browser download → auto-discovered path
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH
    ?? (process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD === "1" ? "/opt/pw-browsers/chromium" : undefined);

  const browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
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
