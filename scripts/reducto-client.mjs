import { Blob } from "node:buffer";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const DEFAULT_API_BASE = "https://platform.reducto.ai";
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;

export async function resolveApiKey() {
  if (process.env.REDUCTO_API_KEY) {
    return { key: process.env.REDUCTO_API_KEY, source: "environment" };
  }

  try {
    const savedConfig = await readFile(path.join(homedir(), ".reducto", "config.yaml"), "utf8");
    const match = savedConfig.match(/^api_key:\s*["']?([^"'\s]+)["']?\s*$/m);
    if (match) return { key: match[1], source: "Reducto CLI" };
  } catch {
    // The interface still works with its committed parse results.
  }

  return { key: null, source: null };
}

function errorMessage(payload, fallback) {
  if (typeof payload?.detail === "string") return payload.detail;
  if (Array.isArray(payload?.detail)) {
    return payload.detail.map((item) => item?.msg).filter(Boolean).join("; ") || fallback;
  }
  return payload?.message || payload?.error || fallback;
}

export async function reductoRequest(apiKey, endpoint, options = {}) {
  if (!apiKey) throw new Error("Reducto is not configured on this server.");

  const base = (process.env.REDUCTO_API_BASE_URL || DEFAULT_API_BASE).replace(/\/$/, "");
  const timeout = Number(process.env.REDUCTO_REQUEST_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const response = await fetch(`${base}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(options.headers || {}),
    },
    signal: options.signal || AbortSignal.timeout(timeout),
  });
  const body = await response.text();
  let payload;

  try {
    payload = JSON.parse(body);
  } catch {
    payload = { raw: body };
  }

  if (!response.ok) {
    const message = errorMessage(payload, body.slice(0, 300) || response.statusText);
    const error = new Error(`Reducto ${response.status}: ${message}`);
    error.status = response.status;
    throw error;
  }

  return payload;
}

export async function uploadDocument(apiKey, { bytes, fileName, mimeType = "application/octet-stream" }) {
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: mimeType }), fileName);
  const upload = await reductoRequest(apiKey, "/upload", {
    method: "POST",
    body: form,
  });

  if (!upload.file_id) throw new Error("Reducto upload completed without a file ID.");
  return upload;
}

export async function parseDocument(apiKey, { input, previewPages = null }) {
  const settings = {
    model: "r-1",
    extraction_mode: "hybrid",
    return_citations: true,
    persist_results: false,
  };

  if (previewPages && Number.isFinite(previewPages) && previewPages > 0) {
    settings.page_range = { start: 1, end: previewPages };
  }

  return reductoRequest(apiKey, "/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input,
      settings,
      formatting: {
        add_page_markers: true,
        table_output_format: "dynamic",
      },
    }),
  });
}
