#!/usr/bin/env node

import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parseDocument, resolveApiKey, uploadDocument } from "./reducto-client.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const distDirectory = path.join(projectDirectory, "site");
const dataPath = path.join(distDirectory, "data", "houses.json");
const outputDirectory = path.join(distDirectory, "data", "reducto");
const argumentsList = process.argv.slice(2);
const primaryOnly = argumentsList.includes("--primary");
const previewArgument = argumentsList.find((argument) => argument.startsWith("--preview-pages="));
const previewPages = previewArgument ? Number(previewArgument.split("=")[1]) : null;
const requestedHouseIds = new Set(argumentsList.filter((argument) => !argument.startsWith("--")));

const { key: apiKey } = await resolveApiKey();

if (!apiKey) {
  console.error(
    [
      "REDUCTO_API_KEY is not set.",
      "Add it to your environment or authenticate the Reducto CLI, then run:",
      "  node scripts/parse-archives.mjs",
      "Options: --primary, --preview-pages=24, or one or more house IDs.",
    ].join("\n"),
  );
  process.exit(1);
}

async function uploadLocalFile(relativeInput) {
  const localPath = path.resolve(distDirectory, relativeInput);
  const bytes = await readFile(localPath);
  const upload = await uploadDocument(apiKey, {
    bytes,
    fileName: path.basename(localPath),
    mimeType: "application/pdf",
  });
  return upload.file_id;
}

async function parseSource(source) {
  const input = /^https?:\/\//.test(source.input)
    ? source.input
    : await uploadLocalFile(source.input);

  return parseDocument(apiKey, { input, previewPages });
}

const houses = JSON.parse(await readFile(dataPath, "utf8"));
const selectedHouses = requestedHouseIds.size
  ? houses.filter((house) => requestedHouseIds.has(house.id))
  : houses;

if (requestedHouseIds.size && selectedHouses.length !== requestedHouseIds.size) {
  const known = new Set(houses.map((house) => house.id));
  const missing = [...requestedHouseIds].filter((id) => !known.has(id));
  console.error(`Unknown house ID: ${missing.join(", ")}`);
  process.exit(1);
}

await mkdir(outputDirectory, { recursive: true });

let existingSources = {};
try {
  const existingIndex = JSON.parse(await readFile(path.join(outputDirectory, "index.json"), "utf8"));
  existingSources = existingIndex.sources || {};
} catch {
  // Start a new index on the first run.
}

const activeSourceKeys = new Set(
  houses.flatMap((house) =>
    house.sources
      .filter((source) => source.parse_ready)
      .map((source) => `${house.id}/${source.id}`),
  ),
);
existingSources = Object.fromEntries(
  Object.entries(existingSources).filter(([key]) => activeSourceKeys.has(key)),
);

const index = {
  generated_at: new Date().toISOString(),
  provider: "Reducto",
  sources: existingSources,
};

for (const house of selectedHouses) {
  const parseReadySources = house.sources.filter((source) => source.parse_ready);
  const sources = primaryOnly ? parseReadySources.slice(0, 1) : parseReadySources;
  await mkdir(path.join(outputDirectory, house.id), { recursive: true });

  for (const source of sources) {
    const key = `${house.id}/${source.id}`;
    process.stdout.write(`Parsing ${house.name} — ${source.title}… `);

    try {
      const result = await parseSource(source);
      const resultPath = path.join(outputDirectory, house.id, `${source.id}.json`);
      await writeFile(resultPath, JSON.stringify(result, null, 2));
      index.sources[key] = {
        status: "complete",
        job_id: result.job_id || null,
        studio_link: result.studio_link || (result.job_id ? `https://studio.reducto.ai/job/${result.job_id}` : null),
        pages: result.usage?.num_pages ?? null,
        credits: result.usage?.credits ?? null,
        page_range: previewPages ? { start: 1, end: previewPages } : null,
        result: `./data/reducto/${house.id}/${source.id}.json`,
      };
      console.log("done");
    } catch (error) {
      index.sources[key] = {
        status: "error",
        error: error.message,
      };
      console.log("failed");
      console.error(`  ${error.message}`);
    }

    await writeFile(path.join(outputDirectory, "index.json"), JSON.stringify(index, null, 2));
  }
}

console.log(`\nWrote ${Object.keys(index.sources).length} source records to site/data/reducto/index.json`);
