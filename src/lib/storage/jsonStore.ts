import { promises as fs } from "fs";
import path from "path";

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");

async function ensureDataFile(fileName: string) {
  await fs.mkdir(dataDir, { recursive: true });
  const filePath = path.join(dataDir, fileName);
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, "[]\n", "utf8");
  }
  return filePath;
}

export async function readCollection<T>(fileName: string): Promise<T[]> {
  const filePath = await ensureDataFile(fileName);
  const raw = await fs.readFile(filePath, "utf8");
  if (!raw.trim()) return [];
  return JSON.parse(raw) as T[];
}

export async function writeCollection<T>(fileName: string, items: T[]) {
  const filePath = await ensureDataFile(fileName);
  await fs.writeFile(filePath, `${JSON.stringify(items, null, 2)}\n`, "utf8");
}

export function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const storeFiles = {
  contents: "contents.json",
  geoOptimizations: "geo-optimizations.json",
  platformVariants: "platform-variants.json",
  publishRecords: "publish-records.json",
  promptTemplates: "prompt-templates.json",
  citationValidations: "citation-validations.json",
};
