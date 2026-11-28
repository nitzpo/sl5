// The shipped data, read off disk the way the browser fetches it, for the
// introduction's tests.

import fs from "fs";
import path from "path";
import type { Block, ThreatModel } from "../../src/engine/types";
import { BLOCK_FILES, MODEL_FILES, type ThreatData } from "../../src/intro/data";

export const DATA_DIR = path.join(__dirname, "../../public/data");

export const readData = (file: string) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf-8"));

export function loadThreatDataFromDisk(): ThreatData {
  const blocks: Block[] = BLOCK_FILES.flatMap((f) => readData(f) as Block[]);
  const [vectors, approaches, scenarios] = MODEL_FILES.map(readData);
  const model: ThreatModel = { vectors, approaches, scenarios };
  return { blocks, model };
}
