# Co-presenter guide

## The one-line idea

The Unlisted Project looks familiar—like a real-estate search product—but replaces price history with the paper trail of a historic home.

## Before the session

1. Open a terminal in the repository.
2. Run `npm run dev`.
3. Open `http://127.0.0.1:4173`.
4. Confirm the map and nine property cards appear.
5. Open Casa de Vidro and confirm the saved Reducto excerpt loads.
6. Keep `archives/` open in Finder for the document handoff.

The interface and saved excerpts work locally. External museum links and Reducto Studio links require internet access. Live parsing also requires `REDUCTO_API_KEY` or an authenticated Reducto CLI before the server starts; the footer will say **Live document parsing with Reducto** when it is ready.

## Suggested five-minute demo

### 1. Familiar shell — 30 seconds

Start on the map. Explain that the interface borrows a real-estate pattern so the audience immediately knows how to browse it.

### 2. Search by document, not social category — 45 seconds

Use **Handwritten**, **Plans & drawings**, or **Long-form records**. The houses remain one archive; the filters describe the evidence rather than splitting people into “royal” or “artists.”

### 3. Open Casa de Vidro — 90 seconds

Point out:

- 11,500 professional records and 15,000 photographs in the institutional collection;
- mixed formats and access restrictions;
- the local 475-page conservation plan;
- the representative Reducto output.

### 4. Open Shaniwar Wada — 90 seconds

Show how the project separates documentary history from folklore. In `archives/shaniwar-wada/`, the local pack includes five long records totaling 1,622 pages, including original Peshwa Daftar volumes.

### 5. End with the workshop prompt — 45 seconds

Ask participants to choose a property or theme, process a messy collection with Reducto, and build a small public-facing way to explore it.

## Suggested presenter split

- **Presenter A:** concept, interface, storytelling, property walkthrough.
- **Presenter B:** source files, Reducto pipeline, structured output, participant build instructions.

## Useful backup paths

- Website: `site/index.html`
- All local archives: `archives/`
- Saved Reducto index: `site/data/reducto/index.json`
- Property and source metadata: `site/data/houses.json`
- Archive download script: `scripts/download-bulky-archives.mjs`
- Reducto parser: `scripts/parse-archives.mjs`

## If something breaks

- **Port 4173 is busy:** run `PORT=4174 npm run dev` and open that port.
- **A Reducto excerpt is missing:** the property still exposes its public source links and local documents.
- **No internet:** avoid opening institutional or Studio links; use the saved output and local PDFs.
- **A source has reuse restrictions:** show the manifest and describe the access model. Do not imply that a linked reading-room collection is locally downloaded.
