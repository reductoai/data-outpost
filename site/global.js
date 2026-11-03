const state = {
  houses: [],
  filtered: [],
  filter: "All",
  query: "",
  alphabetical: false,
  selected: null,
  parseIndex: { sources: {} },
  reducto: { configured: false, source: null, maximumUploadMb: 110 },
  liveParseSource: null,
  latestParse: null,
  saved: new Set(JSON.parse(localStorage.getItem("archive-house-saved") || "[]")),
};

const ui = {
  grid: document.querySelector("#listing-grid"),
  pins: document.querySelector("#map-pins"),
  resultCount: document.querySelector("#result-count"),
  mapCount: document.querySelector("#map-count"),
  empty: document.querySelector("#empty-state"),
  search: document.querySelector("#search-input"),
  overlay: document.querySelector("#property-overlay"),
  propertyContent: document.querySelector("#property-content"),
  propertySave: document.querySelector("#property-save"),
  savedCount: document.querySelector("#saved-count"),
  toast: document.querySelector("#toast"),
  reductoMode: document.querySelector("#reducto-mode"),
  parseDialog: document.querySelector("#parse-dialog"),
  parseConnection: document.querySelector("#parse-connection"),
  parseContext: document.querySelector("#parse-context"),
  parseForm: document.querySelector("#parse-form"),
  parseFile: document.querySelector("#parse-file"),
  parseFileLabel: document.querySelector("#parse-file-label"),
  parseFileLimit: document.querySelector("#parse-file-limit"),
  parseUrl: document.querySelector("#parse-url"),
  parsePages: document.querySelector("#parse-pages"),
  parseSubmit: document.querySelector("#parse-submit"),
  parseProgress: document.querySelector("#parse-progress"),
  parseProgressTitle: document.querySelector("#parse-progress-title"),
  parseProgressCopy: document.querySelector("#parse-progress-copy"),
  parseResult: document.querySelector("#parse-result"),
  parseResultTitle: document.querySelector("#parse-result-title"),
  parseStats: document.querySelector("#parse-stats"),
  parseExcerpt: document.querySelector("#parse-excerpt"),
  parseStudioLink: document.querySelector("#parse-studio-link"),
};

const imageCredits = {
  "haas-lilienthal": ["Library of Congress / HABS", "https://www.loc.gov/pictures/item/ca0652/"],
  "casa-azul": ["Wikimedia Commons", "https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Casa%20Azul%20Frida%20Kahlo"],
  "casa-de-vidro": ["Wikimedia Commons", "https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Casa%20de%20Vidro%20Lina%20Bo%20Bardi"],
  "soane-house": ["Wikimedia Commons", "https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Sir%20John%20Soane%27s%20Museum"],
  "shaniwar-wada": ["Wikimedia Commons", "https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Shaniwar%20Wada"],
  "prince-asaka": ["Wikimedia Commons", "https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Prince%20Asaka%20Residence"],
  "manhyia-palace": ["Wikimedia Commons", "https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Manhyia%20Palace"],
  "baron-empain": ["Wikimedia Commons", "https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Baron%20Empain%20Palace"],
  "vaucluse-house": ["Wikimedia Commons", "https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Vaucluse%20House"],
};

const escapeHTML = (value = "") =>
  String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]);

const sourceKey = (houseId, sourceId) => `${houseId}/${sourceId}`;
const getParseRecord = (houseId, sourceId) => state.parseIndex.sources?.[sourceKey(houseId, sourceId)] || null;

function matchesFilter(house) {
  if (state.filter === "All") return true;
  const archiveText = [
    house.archive_pack?.scope,
    house.brief?.title,
    house.brief?.body,
    ...(house.brief?.moments || []).flatMap((moment) => [moment.date, moment.title, moment.detail]),
    ...(house.archive_pack?.formats || []),
    ...(house.archive_pack?.messiness || []),
    ...house.sources.flatMap((source) => [source.title, source.type]),
  ].join(" ").toLocaleLowerCase();
  if (state.filter === "Handwritten") return /handwrit|cursive|letter|notebook|diar|ledger/.test(archiveText);
  if (state.filter === "Plans") return /plan|drawing|map|architect|diagram|survey|façade|projection/.test(archiveText);
  if (state.filter === "Photographs") return /photo|image|film|video/.test(archiveText);
  if (state.filter === "Long-form") return /volume|report|dossier|finding aid|corpus|journal|book|study|paper|record group/.test(archiveText);
  return true;
}

function applyFilters() {
  const query = state.query.trim().toLocaleLowerCase();
  state.filtered = state.houses.filter((house) => {
    const haystack = [house.name, house.city, house.country, house.continent, house.style, house.category, house.hook, house.summary, house.brief?.title, house.brief?.body, ...(house.brief?.moments || []).flatMap((moment) => [moment.date, moment.title, moment.detail]), house.archive_pack?.scope, ...(house.archive_pack?.formats || []), ...(house.archive_pack?.messiness || [])]
      .join(" ")
      .toLocaleLowerCase();
    return matchesFilter(house) && (!query || haystack.includes(query));
  });
  if (state.alphabetical) state.filtered.sort((a, b) => a.name.localeCompare(b.name));
  renderResults();
}

function renderResults() {
  ui.grid.innerHTML = state.filtered.map((house) => {
    const parsedCount = house.sources.filter((source) => getParseRecord(house.id, source.id)?.status === "complete").length;
    const saved = state.saved.has(house.id);
    return `
      <article class="house-card" data-house="${escapeHTML(house.id)}" tabindex="0" role="button" aria-label="Open ${escapeHTML(house.name)}">
        <div class="card-image">
          <img src="${escapeHTML(house.image)}" alt="" />
          <span class="card-badge">${escapeHTML(house.status)}</span>
          <button class="card-heart ${saved ? "saved" : ""}" type="button" data-save-house="${escapeHTML(house.id)}" aria-label="${saved ? "Unsave" : "Save"} ${escapeHTML(house.name)}">${saved ? "♥" : "♡"}</button>
        </div>
        <div class="card-body">
          <div class="card-primary"><strong>${escapeHTML(house.built)}</strong><span>${parsedCount} Reducto parse</span></div>
          <p class="card-facts">${escapeHTML(house.style)} · ${house.archive_pack?.formats?.length || house.sources.length} record types</p>
          <h2>${escapeHTML(house.name)}</h2>
          <p class="card-location">${escapeHTML(house.city)}, ${escapeHTML(house.country)}</p>
          <p class="card-source">${escapeHTML(house.archive_pack?.scope || `${house.sources.length} verified sources`)}</p>
        </div>
      </article>
    `;
  }).join("");

  ui.pins.innerHTML = state.filtered.map((house) => `
    <button class="map-pin" type="button" style="left:${house.pin.x}%;top:${house.pin.y}%" data-house="${escapeHTML(house.id)}" aria-label="Open ${escapeHTML(house.name)}">${escapeHTML(house.built.replace(/Early |–.*/g, ""))}</button>
  `).join("");

  const count = state.filtered.length;
  ui.resultCount.textContent = count;
  ui.mapCount.textContent = count;
  ui.empty.hidden = count > 0;
  ui.grid.hidden = count === 0;
  ui.savedCount.textContent = state.saved.size;
}

function cleanParsedText(value = "") {
  return value
    .replace(/\[\[(?:START|END) OF PAGE \d+\]\]/gi, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/#{1,6}\s*/g, "")
    .replace(/[*_~|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fileNameFromPath(value = "archive-document") {
  const clean = value.split(/[?#]/)[0];
  return decodeURIComponent(clean.slice(clean.lastIndexOf("/") + 1)) || "archive-document";
}

function setParseConnection() {
  const configured = state.reducto.configured;
  ui.parseConnection.className = `parse-connection ${configured ? "online" : "offline"}`;
  ui.parseConnection.textContent = configured
    ? `Reducto is live · server credential from ${state.reducto.source || "environment"}`
    : "Saved demo mode · add REDUCTO_API_KEY or authenticate the Reducto CLI to parse live";
  ui.parseSubmit.disabled = !configured;
  ui.parseForm.classList.toggle("disabled", !configured);
  ui.parseFileLimit.textContent = configured
    ? `Up to ${state.reducto.maximumUploadMb} MB · the API key never leaves the server.`
    : "The interface still includes saved Reducto results.";
  ui.reductoMode.textContent = configured ? "Live document parsing with Reducto" : "Saved Reducto results · live key not configured";
}

async function checkReductoStatus() {
  try {
    const response = await fetch("./api/reducto/status", { cache: "no-store" });
    if (!response.ok) throw new Error("Status unavailable");
    const status = await response.json();
    state.reducto = {
      configured: Boolean(status.configured),
      source: status.source,
      maximumUploadMb: status.maximum_upload_mb || 110,
    };
  } catch {
    state.reducto = { configured: false, source: null, maximumUploadMb: 110 };
  }
  setParseConnection();
}

function resetParseExperience(clearInputs = false) {
  ui.parseProgress.hidden = true;
  ui.parseResult.hidden = true;
  ui.parseForm.hidden = false;
  ui.parseSubmit.disabled = !state.reducto.configured;
  ui.parseProgressTitle.textContent = "Sending the document to Reducto…";
  ui.parseProgressCopy.textContent = "Scans, handwriting, tables, and unusual layouts are welcome.";
  if (clearInputs) {
    ui.parseFile.value = "";
    ui.parseUrl.value = "";
    ui.parseFileLabel.textContent = "Choose PDF, image, Office file, or spreadsheet";
  }
}

function openParseDialog(houseId = null, sourceId = null) {
  resetParseExperience(true);
  const house = houseId ? state.houses.find((item) => item.id === houseId) : null;
  const source = house?.sources.find((item) => item.id === sourceId) || null;
  state.liveParseSource = source ? { house, source } : null;
  ui.parseContext.hidden = !source;
  ui.parseContext.innerHTML = source
    ? `<span>Selected archive record</span><strong>${escapeHTML(house.name)} · ${escapeHTML(source.title)}</strong>`
    : "";

  if (source) {
    if (/^https?:\/\//.test(source.input)) {
      ui.parseUrl.value = source.input;
      ui.parseFileLabel.textContent = "Or choose a file instead";
    } else {
      ui.parseFileLabel.textContent = `Ready to parse ${source.title}`;
    }
  }

  setParseConnection();
  ui.parseDialog.showModal();
}

function closeParseDialog() {
  if (ui.parseDialog.open) ui.parseDialog.close();
}

async function localSourceFile() {
  const selected = state.liveParseSource?.source;
  if (!selected || /^https?:\/\//.test(selected.input)) return null;
  const response = await fetch(selected.input);
  if (!response.ok) throw new Error("The selected local archive file could not be opened.");
  const blob = await response.blob();
  return new File([blob], fileNameFromPath(selected.input), { type: blob.type || "application/octet-stream" });
}

function renderLiveParse(result, label) {
  const chunks = Array.isArray(result.result?.chunks) ? result.result.chunks : [];
  const blocks = chunks.flatMap((chunk) => Array.isArray(chunk.blocks) ? chunk.blocks : []);
  const blockTypes = [...new Set(blocks.map((block) => block.type).filter(Boolean))];
  const text = cleanParsedText(chunks.map((chunk) => chunk.content || "").join(" "));
  const excerpt = text ? (text.length > 1800 ? `${text.slice(0, 1797).trimEnd()}…` : text) : "Reducto returned structured blocks without a text excerpt.";
  const pages = result.usage?.num_pages ?? "—";
  const credits = result.usage?.credits ?? "—";

  state.latestParse = { result, label };
  ui.parseResultTitle.textContent = label || "Document parsed";
  ui.parseStats.innerHTML = [
    [pages, "pages"],
    [chunks.length, "chunks"],
    [blocks.length, "blocks"],
    [credits, "credits"],
  ].map(([value, name]) => `<div class="parse-stat"><b>${escapeHTML(value)}</b><span>${name}</span></div>`).join("");
  ui.parseExcerpt.textContent = excerpt;
  ui.parseStudioLink.hidden = !/^https:\/\//.test(result.studio_link || "");
  if (!ui.parseStudioLink.hidden) ui.parseStudioLink.href = result.studio_link;
  ui.parseResult.querySelector(".parse-result-head span").textContent = blockTypes.length
    ? `Structured record · ${blockTypes.slice(0, 4).join(" · ")}`
    : "Structured record ready";
  ui.parseForm.hidden = true;
  ui.parseProgress.hidden = true;
  ui.parseResult.hidden = false;
}

async function submitLiveParse(event) {
  event.preventDefault();
  if (!state.reducto.configured) return;

  let file = ui.parseFile.files[0] || null;
  const url = ui.parseUrl.value.trim();
  if (!file && !url) file = await localSourceFile();
  if (!file && !url) {
    showToast("Choose a file or paste a public document URL");
    return;
  }

  const label = file?.name || state.liveParseSource?.source.title || fileNameFromPath(url);
  ui.parseForm.hidden = true;
  ui.parseResult.hidden = true;
  ui.parseProgress.hidden = false;
  ui.parseSubmit.disabled = true;
  const progressTimer = window.setTimeout(() => {
    ui.parseProgressTitle.textContent = "Reading the document’s structure…";
    ui.parseProgressCopy.textContent = "Reducto is reconstructing text, tables, figures, and page-level citations.";
  }, 1800);

  try {
    const previewPages = ui.parsePages.value;
    const options = file
      ? {
          method: "POST",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
            "X-File-Name": encodeURIComponent(file.name),
            "X-Preview-Pages": previewPages,
          },
          body: file,
        }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, preview_pages: previewPages }),
        };
    const response = await fetch("./api/reducto/parse", options);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Reducto could not parse this document.");
    renderLiveParse(result, label);
  } catch (error) {
    ui.parseProgress.hidden = true;
    ui.parseForm.hidden = false;
    ui.parseSubmit.disabled = false;
    showToast(error.message || "The document could not be parsed");
  } finally {
    window.clearTimeout(progressTimer);
  }
}

function downloadLatestParse() {
  if (!state.latestParse) return;
  const blob = new Blob([JSON.stringify(state.latestParse.result, null, 2)], { type: "application/json" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = `${state.latestParse.label.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "reducto-parse"}.json`;
  anchor.click();
  URL.revokeObjectURL(href);
}

function sourceRows(house) {
  return house.sources.map((source, index) => {
    const parsed = getParseRecord(house.id, source.id);
    const link = parsed?.status === "complete" ? parsed.studio_link : source.source_url;
    const label = parsed?.status === "complete" ? '<span class="parsed-badge">Parsed with Reducto</span>' : "";
    return `
      <article class="source-row">
        <span class="source-number">${String(index + 1).padStart(2, "0")}</span>
        <div>
          <h3>${escapeHTML(source.title)} ${label}</h3>
          <p>${escapeHTML(source.institution)} · ${escapeHTML(source.type)} · ${escapeHTML(source.year)}</p>
        </div>
        <div class="source-actions">
          ${source.parse_ready ? `<button type="button" data-parse-house="${escapeHTML(house.id)}" data-parse-source="${escapeHTML(source.id)}">Parse live</button>` : ""}
          <a href="${escapeHTML(link)}" target="_blank" rel="noreferrer" aria-label="Open ${escapeHTML(source.title)}">↗</a>
        </div>
      </article>
    `;
  }).join("");
}

function formatChips(items = [], tone = "format") {
  return items.map((item) => `<span class="archive-chip ${tone}">${escapeHTML(item)}</span>`).join("");
}

function archivePack(house) {
  const pack = house.archive_pack || {};
  return `
    <div class="archive-pack">
      <div class="archive-pack-head">
        <div><span class="archive-eyebrow">Archive pack</span><strong>${escapeHTML(pack.scope || `${house.sources.length} verified sources`)}</strong></div>
        <p>${escapeHTML(pack.date_range || "Date range varies")}<br>${escapeHTML(pack.access || "Institutional access")}</p>
      </div>
      <div class="archive-chip-group" aria-label="Document formats">${formatChips(pack.formats)}</div>
      <div class="archive-messiness"><b>Built for messy documents</b>${formatChips(pack.messiness, "messy")}</div>
    </div>
  `;
}

function storyMoments(house) {
  const moments = house.brief?.moments || [];
  if (!moments.length) return "";
  return `
    <ol class="story-moments">
      ${moments.map((moment) => {
        const sourceNames = (moment.source_ids || [])
          .map((id) => house.sources.find((source) => source.id === id)?.title)
          .filter(Boolean);
        return `
          <li>
            <time>${escapeHTML(moment.date)}</time>
            <div>
              <h3>${escapeHTML(moment.title)}</h3>
              <p>${escapeHTML(moment.detail)}</p>
              ${sourceNames.length ? `<small>From ${escapeHTML(sourceNames.join(" · "))}</small>` : ""}
            </div>
          </li>
        `;
      }).join("")}
    </ol>
  `;
}

async function parsedPreview(house) {
  const target = document.querySelector("[data-parsed-preview]");
  const parsedSource = house.sources.find((source) => getParseRecord(house.id, source.id)?.status === "complete");
  if (!target || !parsedSource) {
    if (target) target.hidden = true;
    return;
  }
  const record = getParseRecord(house.id, parsedSource.id);
  try {
    const response = await fetch(record.result);
    if (!response.ok) throw new Error("Result unavailable");
    const result = await response.json();
    const chunks = Array.isArray(result.result?.chunks) ? result.result.chunks : [];
    const text = cleanParsedText(chunks.map((chunk) => chunk.content || "").join(" "));
    if (!text) throw new Error("No parsed text");
    const excerpt = text.length > 720 ? `${text.slice(0, 717).trimEnd()}…` : text;
    target.innerHTML = `
      <div class="parsed-preview-head"><span>● From the Reducto output</span><span>${escapeHTML(record.pages ?? chunks.length)} pages · ${escapeHTML(parsedSource.title)}</span></div>
      <blockquote>${escapeHTML(excerpt)}</blockquote>
      <a href="${escapeHTML(record.studio_link)}" target="_blank" rel="noreferrer">Inspect structured chunks in Studio ↗</a>
    `;
  } catch {
    target.hidden = true;
  }
}

function openProperty(id, updateHash = true) {
  const house = state.houses.find((item) => item.id === id);
  if (!house) return;
  state.selected = id;
  const parsedSources = house.sources.filter((source) => getParseRecord(house.id, source.id)?.status === "complete");
  const primaryParsed = parsedSources[0] ? getParseRecord(house.id, parsedSources[0].id) : null;
  const saved = state.saved.has(id);
  const pack = house.archive_pack || {};
  const brief = house.brief || {};

  ui.propertyContent.innerHTML = `
    <section class="property-gallery" aria-label="${escapeHTML(house.name)} gallery">
      <figure class="gallery-main"><img src="${escapeHTML(house.image)}" alt="${escapeHTML(house.name)}" /></figure>
      <figure class="alternate"><img src="${escapeHTML(house.image)}" alt="" /></figure>
      <figure class="gallery-document">
        <span>Archive pack</span>
        <blockquote>${escapeHTML(pack.scope || `${house.sources.length} verified sources`)}</blockquote>
        <small>${escapeHTML(pack.date_range || house.sources[0].year)}</small>
      </figure>
      <figure class="alternate"><img src="./assets/world-map.png" alt="" /></figure>
      <figure class="gallery-document">
        <span>Document mix</span>
        <blockquote>${escapeHTML((pack.formats || []).slice(0, 3).join(" · ") || house.hook)}</blockquote>
        <small>${parsedSources.length} representative source${parsedSources.length === 1 ? "" : "s"} parsed with Reducto</small>
      </figure>
    </section>

    <div class="property-layout">
      <div class="property-main">
        <div class="property-title-row">
          <div><h1>${escapeHTML(house.name)}</h1><p>${escapeHTML(house.city)}, ${escapeHTML(house.country)} · ${escapeHTML(house.status)}</p></div>
          <div class="year-built"><b>${escapeHTML(house.built)}</b><span>recorded build date</span></div>
        </div>
        <dl class="property-facts">
          <div><dt>Architecture</dt><dd>${escapeHTML(house.style)}</dd></div>
          <div><dt>Archive access</dt><dd>${escapeHTML(pack.access || "Institutional")}</dd></div>
          <div><dt>Source links</dt><dd>${house.sources.length} verified</dd></div>
          <div><dt>Reducto</dt><dd>${parsedSources.length} parsed</dd></div>
        </dl>

        <section class="property-section">
          <h2>What’s special</h2>
          <p class="story-lede">${escapeHTML(brief.title || house.hook)}</p>
          <p>${escapeHTML(brief.body || house.summary)}</p>
          ${storyMoments(house)}
        </section>

        <section class="property-section archive-pack-section">
          <h2>What’s in the archive</h2>
          <p>Not a tidy brochure: a layered collection of records with different dates, formats, layouts, languages, and levels of access.</p>
          ${archivePack(house)}
        </section>

        <section class="property-section">
          <h2>Archive history</h2>
          <p>Instead of price history, this listing follows the house through the records that document its construction, use, survival, restoration, and afterlife. These links are the public doors into the larger collection.</p>
          <div class="source-list">${sourceRows(house)}</div>
          <p class="archive-note">${escapeHTML(house.source_note)}</p>
        </section>

        <section class="property-section">
          <h2>Inside the parsed record</h2>
          <div class="parsed-preview" data-parsed-preview><div class="parsed-preview-head"><span>● Loading Reducto output</span></div></div>
        </section>
      </div>

      <aside class="property-aside">
        <div class="archive-card">
          <p class="status"><i></i> ${escapeHTML(pack.access || "Public archive available")}</p>
          <h2>Open the records</h2>
          <p>Read the institutional collection, inspect Reducto’s structured output, or save this house for later.</p>
          ${house.sources.some((source) => source.parse_ready) ? `<button type="button" data-parse-house="${escapeHTML(house.id)}" data-parse-source="${escapeHTML(house.sources.find((source) => source.parse_ready).id)}">Parse a record live</button>` : ""}
          <a href="${escapeHTML(house.official_url)}" target="_blank" rel="noreferrer">Visit the institution</a>
          ${primaryParsed ? `<a href="${escapeHTML(primaryParsed.studio_link)}" target="_blank" rel="noreferrer">Open Reducto result</a>` : ""}
          <button type="button" data-save-current>${saved ? "♥ Saved" : "♡ Save this house"}</button>
          <dl>
            <div><dt>Property status</dt><dd>${escapeHTML(house.status)}</dd></div>
            <div><dt>Archive scale</dt><dd>${escapeHTML(pack.scope || `${house.sources.length} sources`)}</dd></div>
            <div><dt>Date range</dt><dd>${escapeHTML(pack.date_range || "Varies")}</dd></div>
            <div><dt>Source links</dt><dd>${house.sources.length}</dd></div>
            <div><dt>Parsed pages</dt><dd>${primaryParsed?.pages ?? "—"}</dd></div>
            <div><dt>Region</dt><dd>${escapeHTML(house.continent)}</dd></div>
          </dl>
        </div>
      </aside>
    </div>
  `;

  ui.propertySave.textContent = saved ? "♥ Saved" : "♡ Save";
  ui.overlay.classList.add("open");
  ui.overlay.setAttribute("aria-hidden", "false");
  ui.overlay.scrollTop = 0;
  document.body.classList.add("overlay-open");
  document.querySelectorAll("[data-house]").forEach((item) => item.classList.toggle("selected", item.dataset.house === id));
  parsedPreview(house);
  if (updateHash) history.replaceState(null, "", `#house=${id}`);
}

function closeProperty() {
  ui.overlay.classList.remove("open");
  ui.overlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("overlay-open");
  document.querySelectorAll(".selected").forEach((item) => item.classList.remove("selected"));
  state.selected = null;
  if (location.hash.startsWith("#house=")) history.replaceState(null, "", "#browse");
}

function toggleSaved(id) {
  if (!id) return;
  if (state.saved.has(id)) state.saved.delete(id);
  else state.saved.add(id);
  localStorage.setItem("archive-house-saved", JSON.stringify([...state.saved]));
  renderResults();
  if (state.selected === id) openProperty(id, false);
  showToast(state.saved.has(id) ? "House saved" : "House removed from saved");
}

function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add("show");
  window.setTimeout(() => ui.toast.classList.remove("show"), 1900);
}

function setFilter(value) {
  state.filter = value;
  document.querySelectorAll("[data-filter]").forEach((button) => button.classList.toggle("active", button.dataset.filter === value));
  applyFilters();
}

function populateCredits() {
  document.querySelector("#credit-list").innerHTML = state.houses.map((house) => {
    const [label, href] = imageCredits[house.id];
    return `<a href="${escapeHTML(href)}" target="_blank" rel="noreferrer">${escapeHTML(house.name)} <span>${escapeHTML(label)} ↗</span></a>`;
  }).join("");
}

async function loadData() {
  const housesResponse = await fetch("./data/houses.json");
  if (!housesResponse.ok) throw new Error("Could not load the archive houses.");
  state.houses = await housesResponse.json();
  try {
    const parseResponse = await fetch("./data/reducto/index.json", { cache: "no-store" });
    if (parseResponse.ok) state.parseIndex = await parseResponse.json();
  } catch {
    // Listings remain useful without the optional Reducto result index.
  }
  applyFilters();
  populateCredits();
  const requested = location.hash.startsWith("#house=") ? location.hash.slice(7) : null;
  if (requested) openProperty(requested, false);
}

document.querySelector("#filters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (button) setFilter(button.dataset.filter);
});

ui.search.addEventListener("input", () => {
  state.query = ui.search.value;
  applyFilters();
});

document.querySelector("#clear-search").addEventListener("click", () => {
  ui.search.value = "";
  state.query = "";
  setFilter("All");
});

document.querySelector("#sort-toggle").addEventListener("click", (event) => {
  state.alphabetical = !state.alphabetical;
  event.currentTarget.firstChild.textContent = state.alphabetical ? "Sort: A–Z " : "Sort: Curator’s picks ";
  applyFilters();
});

document.querySelector("#save-search").addEventListener("click", (event) => {
  event.currentTarget.classList.toggle("saved");
  event.currentTarget.textContent = event.currentTarget.classList.contains("saved") ? "♥ Search saved" : "♡ Save search";
  showToast(event.currentTarget.classList.contains("saved") ? "Search saved" : "Search removed");
});

document.querySelector("#map-area-button").addEventListener("click", () => showToast("Showing all nine archive houses"));
document.querySelector("#saved-nav").addEventListener("click", () => {
  if (!state.saved.size) return showToast("No saved houses yet");
  state.filtered = state.houses.filter((house) => state.saved.has(house.id));
  renderResults();
});

document.querySelector(".browse-shell").addEventListener("click", (event) => {
  const saveButton = event.target.closest("[data-save-house]");
  if (saveButton) {
    event.stopPropagation();
    toggleSaved(saveButton.dataset.saveHouse);
    return;
  }
  const target = event.target.closest("[data-house]");
  if (target) openProperty(target.dataset.house);
});

ui.grid.addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && event.target.closest("[data-house]")) {
    event.preventDefault();
    openProperty(event.target.closest("[data-house]").dataset.house);
  }
});

document.querySelector("#property-back").addEventListener("click", closeProperty);
document.querySelector("#property-close").addEventListener("click", closeProperty);
document.querySelector("#property-save").addEventListener("click", () => toggleSaved(state.selected));
document.querySelector("#property-share").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    showToast("Listing link copied");
  } catch {
    showToast("Share link ready");
  }
});
ui.propertyContent.addEventListener("click", (event) => {
  const parseButton = event.target.closest("[data-parse-source]");
  if (parseButton) {
    openParseDialog(parseButton.dataset.parseHouse, parseButton.dataset.parseSource);
    return;
  }
  if (event.target.closest("[data-save-current]")) toggleSaved(state.selected);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && ui.overlay.classList.contains("open")) closeProperty();
});

const submitDialog = document.querySelector("#submit-dialog");
document.querySelector("#open-submit").addEventListener("click", () => submitDialog.showModal());
document.querySelector("[data-dialog-close]").addEventListener("click", () => submitDialog.close());
document.querySelector("#submit-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const entries = Object.fromEntries(new FormData(event.currentTarget));
  const nominations = JSON.parse(localStorage.getItem("archive-house-nominations") || "[]");
  nominations.push({ ...entries, savedAt: new Date().toISOString() });
  localStorage.setItem("archive-house-nominations", JSON.stringify(nominations));
  event.currentTarget.reset();
  submitDialog.close();
  showToast("Property submitted");
});

document.querySelector("#open-parse").addEventListener("click", () => openParseDialog());
document.querySelector("[data-parse-close]").addEventListener("click", closeParseDialog);
ui.parseForm.addEventListener("submit", submitLiveParse);
ui.parseFile.addEventListener("change", () => {
  const file = ui.parseFile.files[0];
  if (!file) return;
  ui.parseFileLabel.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`;
  ui.parseUrl.value = "";
});
document.querySelector("#download-parse").addEventListener("click", downloadLatestParse);
document.querySelector("#parse-another").addEventListener("click", () => resetParseExperience(true));

const fileDrop = document.querySelector(".file-drop");
["dragenter", "dragover"].forEach((type) => fileDrop.addEventListener(type, (event) => {
  event.preventDefault();
  fileDrop.classList.add("dragging");
}));
["dragleave", "drop"].forEach((type) => fileDrop.addEventListener(type, (event) => {
  event.preventDefault();
  fileDrop.classList.remove("dragging");
}));
fileDrop.addEventListener("drop", (event) => {
  const file = event.dataTransfer.files[0];
  if (!file) return;
  const transfer = new DataTransfer();
  transfer.items.add(file);
  ui.parseFile.files = transfer.files;
  ui.parseFile.dispatchEvent(new Event("change"));
});

const creditsDialog = document.querySelector("#credits-dialog");
document.querySelector("#open-credits").addEventListener("click", () => creditsDialog.showModal());
document.querySelector("[data-credits-close]").addEventListener("click", () => creditsDialog.close());

loadData().catch((error) => {
  ui.grid.innerHTML = `<div class="empty-state"><h2>${escapeHTML(error.message)}</h2></div>`;
  console.error(error);
});
checkReductoStatus();
