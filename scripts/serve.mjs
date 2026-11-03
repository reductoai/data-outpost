#!/usr/bin/env node

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parseDocument, resolveApiKey, uploadDocument } from "./reducto-client.mjs";

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.join(projectDirectory, "site");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const maximumUploadBytes = Number(process.env.MAX_UPLOAD_BYTES || 110 * 1024 * 1024);
const reductoAuth = await resolveApiKey();
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".pdf": "application/pdf",
  ".svg": "image/svg+xml",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".webp": "image/webp",
};

function respondJSON(response, status, payload) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(payload));
}

function httpError(status, message) {
  const error = new Error(message);
  error.httpStatus = status;
  return error;
}

async function readBody(request, limit) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw httpError(413, `Document exceeds the ${Math.round(limit / 1024 / 1024)} MB workshop limit.`);
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

function previewPagesFrom(request, payload = {}) {
  const raw = request.headers["x-preview-pages"] ?? payload.preview_pages;
  if (raw === "all" || raw === 0 || raw === "0" || raw == null) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100) {
    throw httpError(400, "Preview pages must be between 1 and 100, or all.");
  }
  return Math.round(parsed);
}

async function handleReductoAPI(request, response, pathname) {
  if (pathname === "/api/reducto/status" && request.method === "GET") {
    respondJSON(response, 200, {
      configured: Boolean(reductoAuth.key),
      source: reductoAuth.source,
      saved_fallback: true,
      maximum_upload_mb: Math.round(maximumUploadBytes / 1024 / 1024),
    });
    return true;
  }

  if (pathname !== "/api/reducto/parse") return false;
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    respondJSON(response, 405, { error: "Method not allowed." });
    return true;
  }
  if (!reductoAuth.key) {
    respondJSON(response, 503, {
      error: "Live parsing is not configured. Set REDUCTO_API_KEY or authenticate the Reducto CLI, then restart the server.",
    });
    return true;
  }

  try {
    const contentType = String(request.headers["content-type"] || "").split(";")[0].trim();
    let input;
    let previewPages;

    if (contentType === "application/json") {
      const body = await readBody(request, 64 * 1024);
      const payload = JSON.parse(body.toString("utf8") || "{}");
      if (typeof payload.url !== "string" || !payload.url.trim()) throw httpError(400, "Add a public document URL.");
      let url;
      try {
        url = new URL(payload.url);
      } catch {
        throw httpError(400, "Add a valid public document URL.");
      }
      if (!["http:", "https:"].includes(url.protocol)) throw httpError(400, "Use a public HTTP or HTTPS document URL.");
      input = url.toString();
      previewPages = previewPagesFrom(request, payload);
    } else {
      const bytes = await readBody(request, maximumUploadBytes);
      if (!bytes.length) throw httpError(400, "Choose a document to parse.");
      const encodedName = String(request.headers["x-file-name"] || "archive-document");
      const fileName = path.basename(decodeURIComponent(encodedName)).replace(/[\u0000-\u001f]/g, "");
      const upload = await uploadDocument(reductoAuth.key, {
        bytes,
        fileName: fileName || "archive-document",
        mimeType: contentType || "application/octet-stream",
      });
      input = upload.file_id;
      previewPages = previewPagesFrom(request);
    }

    const result = await parseDocument(reductoAuth.key, { input, previewPages });
    respondJSON(response, 200, result);
  } catch (error) {
    const status = error.httpStatus || (error instanceof SyntaxError ? 400 : 502);
    respondJSON(response, status, { error: error.message || "The document could not be parsed." });
  }

  return true;
}

createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host || `${host}:${port}`}`).pathname);

  try {
    if (await handleReductoAPI(request, response, pathname)) return;

    const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const candidate = path.resolve(root, relative);
    if (!candidate.startsWith(`${root}${path.sep}`) && candidate !== root) throw new Error("Invalid path");
    const details = await stat(candidate);
    const filePath = details.isDirectory() ? path.join(candidate, "index.html") : candidate;
    response.writeHead(200, {
      "Content-Type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, host, () => {
  const mode = reductoAuth.key ? `live via ${reductoAuth.source}` : "saved-result fallback";
  console.log(`The Unlisted Project is running at http://${host}:${port}/ (${mode})`);
});
