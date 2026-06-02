import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(scriptDirectory, "..");
const sourceDirectory = path.resolve(
  desktopRoot,
  "node_modules/vditor/dist",
);
const targetDirectory = path.resolve(desktopRoot, "public/vditor/dist");

fs.mkdirSync(path.dirname(targetDirectory), { recursive: true });
fs.rmSync(targetDirectory, { force: true, recursive: true });
fs.cpSync(sourceDirectory, targetDirectory, { recursive: true });

