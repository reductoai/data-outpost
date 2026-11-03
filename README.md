# The Unlisted Project

The Unlisted Project is a Zillow-style interface for exploring historic homes through the documents that preserve them: handwritten letters, plans, minute books, photographs, finding aids, restoration reports, newspapers, and institutional catalogues.

The project was built for a hands-on Reducto workshop. It pairs a browsable public-record interface with real, messy local archive packs and saved representative Reducto outputs.

## Quick start

You need Node.js 18 or newer. No package installation is required.

```bash
npm run dev
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173). The server reads only from `site/`.

## What is included

| Part | Purpose |
| --- | --- |
| `site/` | The complete static Unlisted Project interface |
| `archives/` | Local document packs for all nine properties |
| `site/data/reducto/` | Saved structured outputs for one representative source per house |
| `scripts/download-bulky-archives.mjs` | Rebuilds the curated public download packs |
| `scripts/parse-archives.mjs` | Sends selected sources to Reducto |
| `docs/CO_PRESENTER_GUIDE.md` | Run-of-show, demo path, and handoff notes |
| `docs/RIGHTS_AND_ACCESS.md` | Source, access, and reuse caveats |

## Archive coverage

The curated cross-property pack contains **36 PDFs, 5,378 pages, and 357.5 MB**. The complete Haas–Lilienthal / 1906 San Francisco collection adds **194 files and about 520 MB**. Everything is consolidated under `archives/`.

| Property | Curated files | Pages | Curated size |
| --- | ---: | ---: | ---: |
| Haas–Lilienthal House | 6 | 35 | 5.3 MB |
| Casa Azul | 4 | 73 | 0.7 MB |
| Casa de Vidro | 2 | 266 | 48.5 MB |
| Sir John Soane’s Museum | 4 | 487 | 37.9 MB |
| Shaniwar Wada | 5 | 1,622 | 154.8 MB |
| Prince Asaka Residence | 3 | 146 | 18.9 MB |
| Manhyia Palace | 4 | 1,138 | 52.4 MB |
| Baron Empain Palace | 3 | 45 | 6.9 MB |
| Vaucluse House | 5 | 1,566 | 32.2 MB |

Each property folder includes `manifest.json` with original URLs, byte sizes, page counts, SHA-256 checksums, and links to collections that cannot be downloaded in bulk.

## Reducto

The repository includes previously saved parse results, so the interface works without an API key. It also includes a live, server-side Reducto workflow: visitors can upload a document or choose a public archive URL, preview 12 or 24 pages (or the full document), inspect structured text and block counts, open the result in Studio, and download the response JSON.

Start the live workflow with an environment secret:

```bash
REDUCTO_API_KEY="your_key" npm run dev
```

Alternatively, authenticate the Reducto CLI. The server reads `~/.reducto/config.yaml` at startup. The API key remains on the server and is never sent to the browser or committed to Git.

Open a house and choose **Parse live** beside a supported record, or use **Parse a document** in the top navigation. Without a credential, those controls explain the setup and the saved results continue to work.

To regenerate the committed representative parses:

```bash
npm run reducto:parse
```

The script reads the same server-side credential. Never commit an API key.

Examples:

```bash
node scripts/parse-archives.mjs casa-de-vidro --primary --preview-pages=24
node scripts/parse-archives.mjs shaniwar-wada --preview-pages=24
```

MCP is optional: use it when workshop participants are building through Claude, Cursor, or another agent. The Unlisted Project website itself uses the Reducto API because a server route can keep the credential secret. A static-only host will show saved outputs but cannot safely provide live parsing; deploy `scripts/serve.mjs` (or port its two `/api/reducto/*` routes to your host) and set `REDUCTO_API_KEY` as a deployment secret.

The included server binds to `127.0.0.1` by default and is designed for the presenter’s laptop. Before exposing live parsing on a public URL, add user authentication, rate limiting, and usage controls so anonymous visitors cannot consume the Reducto account’s credits.

## Rebuilding the public archive packs

```bash
npm run archives:download
```

Downloads are resumable: existing non-empty files are retained. The script recreates checksummed manifests and clearly separates downloadable files from reading-room or item-level collections.

## Sharing note

This repository is large because it intentionally includes archival scans. Its largest individual file is below GitHub’s 100 MB hard limit, but a normal clone is still roughly 900 MB. For a lightweight code-only GitHub repository, place `archives/` in a shared Drive or release bundle and keep the manifests in Git.

See [the co-presenter guide](docs/CO_PRESENTER_GUIDE.md) before presenting.
