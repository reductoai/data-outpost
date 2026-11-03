#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import { createReadStream, createWriteStream } from "node:fs";
import { copyFile, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const outputDirectory = path.join(projectDirectory, "archives");
const siteDocsDirectory = path.join(projectDirectory, "site", "assets", "docs");
const userAgent = "ArchiveHouseWorkshop/1.0 (+public archival research download)";
const execFile = promisify(execFileCallback);

const ia = (identifier, filename) =>
  `https://archive.org/download/${identifier}/${encodeURIComponent(filename)}`;

const packs = [
  {
    id: "haas-lilienthal",
    title: "Haas–Lilienthal House",
    note: "A selected in-project copy. The existing 520 MB San Francisco archive remains the canonical full pack in Downloads.",
    local: [
      ["haas-habs-record.pdf", "Historic American Buildings Survey"],
      ["haas-national-register.pdf", "National Register nomination"],
      ["haas-photo-cards.pdf", "Handwritten National Register photo cards"],
      ["william-chapman-letter.pdf", "William Chapman handwritten letter"],
      ["1906-newspaper.pdf", "1906 newspaper"],
      ["mayor-proclamation.pdf", "Mayor proclamation"],
    ],
    files: [],
  },
  {
    id: "casa-azul",
    title: "Casa Azul",
    note: "Public institutional publications and finding aids. The Smithsonian image collection is linked in the manifest because it is not offered as a bulk public download.",
    files: [
      {
        name: "museo-frida-kahlo-casa-azul-hogar-y-legado-2025.pdf",
        title: "La Casa Azul: hogar y legado",
        url: "https://www.museofridakahlo.org.mx/wp/wp-content/uploads/2025/06/Comunicado-MFK-MDRA003-La-Casa-Azul-MFK-el-hogar-de-Frida-legado-vivo-de-Me%CC%81xico_VF-1.pdf",
      },
      {
        name: "smithsonian-hayden-herrera-papers-finding-aid.pdf",
        title: "Hayden Herrera papers finding aid",
        url: "https://sirismm.si.edu/EADpdfs/AAA.herrhayd.pdf",
      },
      {
        name: "nmwa-frida-kahlo-papers-finding-aid.pdf",
        title: "Frida Kahlo papers finding aid",
        url: "https://nmwa.org/wp-content/uploads/2022/07/Frida-Kahlo-Finding-Aid-June-2022.pdf",
      },
      {
        name: "smithsonian-weatherwax-kahlo-rivera-finding-aid.pdf",
        title: "John Weatherwax papers relating to Frida Kahlo and Diego Rivera — finding aid",
        url: "https://sirismm.si.edu/EADpdfs/AAA.weatjohn.pdf",
      },
    ],
    linkedCollections: [
      {
        title: "John Weatherwax papers relating to Frida Kahlo and Diego Rivera — 805 digitized images",
        url: "https://www.aaa.si.edu/collections/john-weatherwax-papers-relating-to-frida-kahlo-and-diego-rivera-9609/how-to-use",
        access: "Public item-by-item digital access; no bulk package offered",
      },
    ],
  },
  {
    id: "casa-de-vidro",
    title: "Casa de Vidro",
    files: [
      {
        name: "casa-de-vidro-conservation-management-plan-475-pages.pdf",
        title: "Casa de Vidro conservation management plan",
        url: "https://media.getty.edu/Text/c0d9548c-5520-5268-beff-e6ae1ab292b5.pdf",
      },
      {
        name: "lina-bo-bardi-drawing-100-works-catalogue.pdf",
        title: "Lina Bo Bardi: Drawing — exhibition catalogue",
        url: "https://www.fmirobcn.org/media/upload/pdf/ddp-lina-bo-bardi-eng_155066026076.pdf",
      },
    ],
    linkedCollections: [
      {
        title: "Instituto Bardi online archive — 8,000+ drawings",
        url: "https://acervo.institutobardi.org.br/",
        access: "Searchable online; documents and photographs require an onsite appointment",
      },
    ],
  },
  {
    id: "soane-house",
    title: "Sir John Soane’s Museum",
    files: [
      {
        name: "soane-description-of-house-and-museum-1843-wellcome-scan.pdf",
        title: "Description of the House and Museum — historic scan",
        url: ia("b30456678", "b30456678.pdf"),
      },
      {
        name: "soane-description-of-house-and-museum-getty-scan.pdf",
        title: "Description of the House and Museum — Getty scan",
        url: ia("gri_descriptiono00soan", "gri_descriptiono00soan.pdf"),
      },
      {
        name: "soane-museum-illustrated-guide.pdf",
        title: "Museum and house illustrated guide",
        url: "https://www.soane.org/sites/default/files/downloads/sir-john-soanes-museum-easy-read-guide.pdf",
      },
      {
        name: "soane-museum-annual-report-2018-19.pdf",
        title: "Museum annual report with digitisation notes",
        url: "https://www.soane.org/sites/default/files/2023-06/SJSM%20ARA%202018-19_Web%20accessible.pdf",
      },
    ],
    linkedCollections: [
      {
        title: "Digitized office day books, 1791–1837",
        url: "https://collections.soane.org/archives?ci_search_type=ARCI&mi_search_type=adv&sort=7&t=ARC11740&tn=Archives",
        access: "Item-level online archive",
      },
    ],
  },
  {
    id: "shaniwar-wada",
    title: "Shaniwar Wada",
    files: [
      {
        name: "peshwa-daftar-vol-37-karnatak-expeditions.pdf",
        title: "Selections from the Peshwa Daftar no. 37 — Karnatak expeditions",
        url: ia("zvba-madhavrao-peshvyachya-karnatakatil-swarya-selectio", "Madhavrao Peshvyachya Karnatakatil Swarya Selections From The Peshwa Daftar No 37 By G S Sardesai Marathi And English History Mumbai 1934 - Government Central Press.pdf"),
      },
      {
        name: "peshwa-daftar-vol-9-northern-india.pdf",
        title: "Selections from the Peshwa Daftar vol. IX — affairs of northern India",
        url: ia("india.history.resource.91649", "91649.pdf"),
      },
      {
        name: "peshwa-daftar-vol-8-shahu-private-life.pdf",
        title: "Selections from the Peshwa Daftar no. 8 — Shahu in private life",
        url: ia("ljjc-selections-from-the-peshwa-daftar-8-shahu-in-his-p", "Selections From The Peshwa Daftar 8 Shahu In His Private Life English Marathi Devanagari History Illustrated Mumbai 1931 - Government Central Press.pdf"),
      },
      {
        name: "introduction-to-the-peshwas-diaries.pdf",
        title: "Introduction to the Peishwa’s diaries",
        url: ia("introductiontope00ranarich", "introductiontope00ranarich.pdf"),
      },
      {
        name: "icj-description-of-peshwa-daftar-records-1956.pdf",
        title: "Government description of Peshwa Daftar records",
        url: "https://icj-web.leman.un-icc.cloud/sites/default/files/case-related/32/9126.pdf",
      },
    ],
    linkedCollections: [
      {
        title: "Complete digital text of 45 Peshwa Daftar volumes",
        url: "https://indike.org/pramana/in.darkages.maratha.daftar.peshwa-daftar",
        access: "Public-domain searchable corpus",
      },
    ],
  },
  {
    id: "prince-asaka",
    title: "Prince Asaka Residence",
    files: [
      {
        name: "prince-asaka-architecture-a-to-z-research-dossier.pdf",
        title: "Architecture A–Z research dossier",
        url: "https://www.teien-art-museum.ne.jp/wp-content/uploads/2024/05/teibi-report-design-0523-web-1.pdf",
      },
      {
        name: "looking-at-architecture-2025-dossier.pdf",
        title: "Looking at Architecture 2025 dossier",
        url: "https://www.teien-art-museum.ne.jp/wp-content/uploads/2025/05/PressRelease_en_v1_Looking_at_Architecture_2025.pdf",
      },
      {
        name: "animals-in-the-residence-of-prince-asaka.pdf",
        title: "Animals in the Residence illustrated handout",
        url: "https://www.teien-art-museum.ne.jp/wp-content/uploads/2026/04/Handout-animals-in-the-residence-of-prince-Asaka.pdf",
      },
    ],
  },
  {
    id: "manhyia-palace",
    title: "Manhyia Palace",
    note: "Includes institution-led holdings information plus historical context scans. Colonial-era publications are retained as sources to interrogate, not as neutral interpretation.",
    files: [
      {
        name: "collections-management-at-manhyia-palace-museum.pdf",
        title: "Collections management at Manhyia Palace Museum",
        url: "https://ir.uew.edu.gh/bitstream/handle/123456789/3314/Collections%20management%20at%20Manhyia%20palace%20museum.pdf?isAllowed=y&sequence=1",
      },
      {
        name: "correspondence-relating-to-ashanti-1901.pdf",
        title: "Correspondence relating to Ashanti, 1901",
        url: ia("india.history.resource.106615", "106615.pdf"),
      },
      {
        name: "downfall-of-prempeh-1900-scan.pdf",
        title: "The Downfall of Prempeh — historic scan",
        url: ia("downfallofprempe00baderich", "downfallofprempe00baderich.pdf"),
      },
      {
        name: "history-of-the-gold-coast-and-ashanti-volumes.pdf",
        title: "A History of the Gold Coast and Ashanti — historic scan",
        url: ia("cu31924088423466", "cu31924088423466.pdf"),
      },
    ],
    linkedCollections: [
      {
        title: "Manhyia Archives holdings and record groups",
        url: "https://www.manhyiaarchives.org/holdings",
        access: "Catalogue online; underlying records by consultation",
      },
    ],
  },
  {
    id: "baron-empain",
    title: "Baron Empain Palace",
    files: [
      {
        name: "baron-empain-reuse-and-structural-analysis.pdf",
        title: "Reuse and structural analysis of Baron Empain Palace",
        url: "https://sci-cult.com/wp-content/uploads/2018/04/4-1_No_3.pdf",
      },
      {
        name: "baron-empain-conservation-and-sustainable-reuse.pdf",
        title: "Conservation and sustainable reuse",
        url: "https://flore.unifi.it/bitstream/2158/1247487/1/Puma%20et%20al_2021_IOP_Conf._Ser.__Earth_Environ._Sci._863_012009.pdf",
      },
      {
        name: "sustainable-restoration-survey-and-analysis-smc-2021.pdf",
        title: "Sustainable restoration: survey and analysis — full SMC issue",
        url: "https://iris.unipa.it/retrieve/e3ad8928-c0b6-da0e-e053-3705fe0a2b96/SMC_14_2021_%20Estratto%20R.M.Vitrano_com.pdf",
      },
    ],
    linkedCollections: [
      {
        title: "Egyptian Presidency restoration dossier overview",
        url: "https://www.presidency.eg/en/%D8%A7%D9%84%D9%85%D8%B4%D8%A7%D8%B1%D9%8A%D8%B9-%D8%A7%D9%84%D9%82%D9%88%D9%85%D9%8A%D8%A9/%D8%AA%D8%B1%D9%85%D9%8A%D9%85-%D9%82%D8%B5%D8%B1-%D8%A7%D9%84%D8%A8%D8%A7%D8%B1%D9%88%D9%86-%D8%A5%D9%85%D8%A8%D8%A7%D9%86/",
        access: "Public project record; full institutional dossier not offered as one download",
      },
    ],
  },
  {
    id: "vaucluse-house",
    title: "Vaucluse House",
    files: [
      {
        name: "vaucluse-house-minute-book-1967-1971.pdf",
        title: "Trustees’ minute book, 1967–1971",
        url: ia("Vaucluse-43079-1967-71", "43079_1967-71.pdf"),
      },
      {
        name: "vaucluse-house-minute-book-1972-1973.pdf",
        title: "Historic Site minute book, 1972–1973",
        url: ia("Vaucluse-43079-1972-73", "43079_1972-73.pdf"),
      },
      {
        name: "vaucluse-house-minute-book-1973-1974.pdf",
        title: "Historic Site minute book, 1973–1974",
        url: ia("Vaucluse-43079-1973-74", "43079_1973-74.pdf"),
      },
      {
        name: "vaucluse-house-minute-book-1974-1975.pdf",
        title: "Historic Site minute book, 1974–1975",
        url: ia("Vaucluse-43079-1974-75", "43079_1974-75.pdf"),
      },
      {
        name: "state-library-nsw-foundation-report-wentworth-papers.pdf",
        title: "State Library NSW Foundation report describing Wentworth family papers",
        url: "https://www.sl.nsw.gov.au/sites/default/files/foundation_annual_report_2014-15.pdf",
      },
    ],
  },
];

async function sha256(filePath) {
  const hash = createHash("sha256");
  await pipeline(createReadStream(filePath), hash);
  return hash.digest("hex");
}

async function pdfPageCount(filePath) {
  const { stdout } = await execFile("pdfinfo", [filePath]);
  const match = stdout.match(/^Pages:\s+(\d+)/m);
  if (!match) throw new Error("PDF page count unavailable");
  return Number(match[1]);
}

async function download(url, destination) {
  const temporary = `${destination}.part`;
  await rm(temporary, { force: true });
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": userAgent, Accept: "application/pdf,application/octet-stream;q=0.9,*/*;q=0.5" },
  });
  if (!response.ok || !response.body) throw new Error(`${response.status} ${response.statusText}`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(temporary));
  await rename(temporary, destination);
}

await mkdir(outputDirectory, { recursive: true });
const index = { generated_at: new Date().toISOString(), packs: [] };

for (const pack of packs) {
  const packDirectory = path.join(outputDirectory, pack.id);
  await mkdir(packDirectory, { recursive: true });
  const manifest = {
    id: pack.id,
    title: pack.title,
    note: pack.note || null,
    files: [],
    linked_collections: pack.linkedCollections || [],
  };

  for (const [filename, title] of pack.local || []) {
    const source = path.join(siteDocsDirectory, filename);
    const destination = path.join(packDirectory, filename);
    process.stdout.write(`${pack.title} — copying ${filename}… `);
    try {
      await copyFile(source, destination);
      const details = await stat(destination);
      manifest.files.push({ name: filename, title, source_url: `../dist/assets/docs/${filename}`, bytes: details.size, pages: await pdfPageCount(destination), sha256: await sha256(destination), status: "complete" });
      console.log("done");
    } catch (error) {
      manifest.files.push({ name: filename, title, source_url: `../dist/assets/docs/${filename}`, status: "error", error: error.message });
      console.log(`failed (${error.message})`);
    }
  }

  for (const file of pack.files) {
    const destination = path.join(packDirectory, file.name);
    process.stdout.write(`${pack.title} — downloading ${file.name}… `);
    try {
      let shouldDownload = true;
      try {
        const existing = await stat(destination);
        shouldDownload = existing.size === 0;
      } catch {
        // Download missing files.
      }
      if (shouldDownload) await download(file.url, destination);
      const details = await stat(destination);
      manifest.files.push({ name: file.name, title: file.title, source_url: file.url, bytes: details.size, pages: await pdfPageCount(destination), sha256: await sha256(destination), status: "complete" });
      console.log(`${(details.size / 1024 / 1024).toFixed(1)} MB`);
    } catch (error) {
      manifest.files.push({ name: file.name, title: file.title, source_url: file.url, status: "error", error: error.message });
      console.log(`failed (${error.message})`);
    }
  }

  const completed = manifest.files.filter((file) => file.status === "complete");
  manifest.total_bytes = completed.reduce((sum, file) => sum + file.bytes, 0);
  manifest.total_pages = completed.reduce((sum, file) => sum + file.pages, 0);
  manifest.completed_files = completed.length;
  manifest.failed_files = manifest.files.length - completed.length;
  await writeFile(path.join(packDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  index.packs.push({ id: pack.id, title: pack.title, files: manifest.completed_files, pages: manifest.total_pages, failed: manifest.failed_files, bytes: manifest.total_bytes, manifest: `./${pack.id}/manifest.json` });
}

index.total_bytes = index.packs.reduce((sum, pack) => sum + pack.bytes, 0);
index.total_files = index.packs.reduce((sum, pack) => sum + pack.files, 0);
index.total_pages = index.packs.reduce((sum, pack) => sum + pack.pages, 0);
index.failed_files = index.packs.reduce((sum, pack) => sum + pack.failed, 0);
await writeFile(path.join(outputDirectory, "index.json"), `${JSON.stringify(index, null, 2)}\n`);

const lines = [
  "# The Unlisted Project — bulky local archive packs",
  "",
  `Generated ${index.generated_at}.`,
  "",
  "Each folder contains downloaded public files plus a manifest with original URLs, byte sizes, SHA-256 checksums, and access notes. Institutional holdings that are not offered as bulk downloads remain listed under `linked_collections`; they are not represented as local files.",
  "",
  "| Property | Local files | Pages | Size | Failed |",
  "| --- | ---: | ---: | ---: | ---: |",
  ...index.packs.map((pack) => `| ${pack.title} | ${pack.files} | ${pack.pages.toLocaleString("en-US")} | ${(pack.bytes / 1024 / 1024).toFixed(1)} MB | ${pack.failed} |`),
  "",
  `**Total:** ${index.total_files} files, ${index.total_pages.toLocaleString("en-US")} pages, ${(index.total_bytes / 1024 / 1024).toFixed(1)} MB.`,
  "",
  "The full pre-existing Haas–Lilienthal / 1906 San Francisco workshop archive remains at `/Users/palakagarwal/Downloads/sf-1906-haas-lilienthal-messy-archive` (about 520 MB).",
  "",
];
await writeFile(path.join(outputDirectory, "README.md"), lines.join("\n"));

console.log(`\nDownloaded ${index.total_files} files (${(index.total_bytes / 1024 / 1024).toFixed(1)} MB) into ${outputDirectory}`);
if (index.failed_files) console.log(`${index.failed_files} files failed; inspect the per-pack manifests.`);
