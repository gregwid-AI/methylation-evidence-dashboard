"use strict";

const themeButton = document.querySelector(".theme-toggle");
themeButton?.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  const url = new URL(window.location.href);
  url.searchParams.set("scoutTheme", next);
  history.replaceState(null, "", url);
  propagateTheme();
});

function propagateTheme() {
  const selected = new URLSearchParams(window.location.search).get("scoutTheme");
  if (!selected) return;
  document.querySelectorAll('a[href]').forEach((link) => {
    const url = new URL(link.href, window.location.href);
    if (url.origin === window.location.origin && url.pathname.endsWith(".html")) {
      url.searchParams.set("scoutTheme", selected);
      link.href = url.href;
    }
  });
}
propagateTheme();

function showError(container, status, message) {
  status.textContent = message;
  const error = document.createElement("p");
  error.className = "empty error";
  error.textContent = "The report viewer could not be loaded. Reload this page or open the actual redacted PDFs below.";
  const links = document.createElement("p");
  for (const [label, href] of [
    ["Comprehensive dossier (PDF)", "downloads/report-1.pdf"],
    ["Clinical briefing (PDF)", "downloads/report-2.pdf"],
  ]) {
    const link = document.createElement("a");
    link.href = href;
    link.textContent = label;
    links.append(link, document.createTextNode(" "));
  }
  container.replaceChildren(error, links);
}

async function loadReports() {
  const content = document.querySelector("#report-content");
  const status = document.querySelector("#report-status");
  const search = document.querySelector("#report-search");
  const filter = document.querySelector("#report-filter");
  const viewMode = document.querySelector("#report-view");
  const params = new URLSearchParams(window.location.search);
  let reports;
  try {
    const response = await fetch("reports.json?v=pdf-original-2");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    reports = await response.json();
    if (!Array.isArray(reports) || reports.length !== 2 ||
        reports.some((report) => typeof report.title !== "string" ||
          !Array.isArray(report.pages) ||
          report.pages.some((page) => typeof page.text !== "string" ||
            typeof page.image !== "string" || !Number.isInteger(page.width) ||
            !Number.isInteger(page.height)))) {
      throw new Error("Unexpected report data format");
    }
  } catch (error) {
    showError(content, status, `Report loading failed: ${error.message}`);
    search.disabled = true;
    filter.disabled = true;
    viewMode.disabled = true;
    document.querySelector("#print-reports").disabled = true;
    return;
  }
  if (reports.some((report) => report.id === params.get("report"))) {
    filter.value = params.get("report");
  }
  if (!navigator.pdfViewerEnabled || window.matchMedia("(max-width: 600px)").matches ||
      params.has("page") || params.get("view") === "images") {
    viewMode.value = "images";
  }

  const views = reports.map((report) => {
    const section = document.createElement("section");
    section.className = "source-report";
    section.id = report.id;
    const head = document.createElement("div");
    head.className = "source-head";
    const title = document.createElement("h2");
    title.textContent = report.title;
    const actions = document.createElement("div");
    actions.className = "actions";
    const open = document.createElement("a");
    open.className = "button primary";
    open.href = `${report.download}?v=pdf-original-2`;
    open.target = "_blank";
    open.rel = "noopener";
    open.textContent = "Open actual PDF";
    const download = document.createElement("a");
    download.className = "button";
    download.href = `${report.download}?v=pdf-original-2`;
    download.download = `${report.id}.pdf`;
    download.textContent = `Download PDF / ${report.pageCount} pages`;
    actions.append(open, download);
    head.append(title, actions);
    section.append(head);
    const pdf = document.createElement("iframe");
    pdf.className = "pdf-viewer";
    pdf.title = `${report.title} - original PDF with privacy masks`;
    pdf.dataset.src = `${report.download}?v=pdf-original-2#view=FitH`;
    const fallback = document.createElement("p");
    fallback.className = "fine pdf-fallback";
    fallback.textContent = "If the embedded PDF is blank or unavailable, choose Original page images above, or Open actual PDF.";
    section.append(pdf, fallback);
    const imagePages = document.createElement("div");
    imagePages.className = "pdf-page-list";
    const pages = report.pages.map((page) => {
      const figure = document.createElement("figure");
      figure.className = "pdf-page";
      figure.id = `${report.id}-page-${page.number}`;
      const caption = document.createElement("figcaption");
      caption.textContent = `Page ${page.number} of ${report.pageCount}`;
      const link = document.createElement("a");
      link.className = "page-link";
      link.href = `reports.html?report=${report.id}&page=${page.number}#${figure.id}`;
      link.textContent = "Link to page";
      caption.append(link);
      const image = document.createElement("img");
      image.dataset.src = page.image;
      image.width = page.width;
      image.height = page.height;
      image.loading = "lazy";
      image.alt = `${report.title}, original PDF page ${page.number}; identifying details masked.`;
      image.addEventListener("error", () => {
        status.textContent = `Page image could not load: ${report.title}, page ${page.number}. Use Open actual PDF to read the report.`;
      });
      const accessible = document.createElement("details");
      accessible.className = "accessible-text";
      const summary = document.createElement("summary");
      summary.textContent = "Accessible text alternative";
      const text = document.createElement("pre");
      text.className = "source-text";
      text.textContent = page.text;
      accessible.append(summary, text);
      figure.append(caption, image, accessible);
      imagePages.append(figure);
      return { figure, image, source: page.text };
    });
    section.append(imagePages);
    content.append(section);
    return { section, pdf, fallback, imagePages, id: report.id, pages };
  });
  const empty = document.createElement("p");
  empty.className = "empty";
  empty.textContent = "No pages match. Clear the search or select both reports.";
  content.append(empty);

  function update() {
    const term = search.value.trim().toLocaleLowerCase();
    if (term) viewMode.value = "images";
    const useImages = viewMode.value === "images";
    let visiblePages = 0;
    let visibleReports = 0;
    views.forEach((view) => {
      const selected = filter.value === "all" || filter.value === view.id;
      let found = 0;
      view.pages.forEach((page) => {
        const matches = !term || page.source.toLocaleLowerCase().includes(term);
        page.figure.hidden = !selected || !matches;
        if (selected && matches) {
          found++;
          if (useImages && !page.image.hasAttribute("src")) {
            page.image.src = page.image.dataset.src;
          }
        }
      });
      view.section.hidden = found === 0;
      view.pdf.hidden = useImages;
      view.fallback.hidden = useImages;
      view.imagePages.hidden = !useImages;
      if (selected && !useImages && !view.pdf.hasAttribute("src")) {
        view.pdf.src = view.pdf.dataset.src;
      }
      visiblePages += found;
      if (found) visibleReports++;
    });
    empty.hidden = visiblePages !== 0;
    status.textContent = `${visiblePages} of 9 original PDF pages${term ? " matching your search" : ""} across ${visibleReports} report${visibleReports === 1 ? "" : "s"}. Original layout, with privacy masks only.`;
  }
  search.addEventListener("input", update);
  filter.addEventListener("change", update);
  viewMode.addEventListener("change", () => {
    if (viewMode.value === "pdf") search.value = "";
    update();
  });
  document.querySelector("#print-reports").addEventListener("click", async () => {
    viewMode.value = "images";
    update();
    const images = views.flatMap((view) => view.pages)
      .filter((page) => !page.figure.hidden).map((page) => page.image);
    try {
      await Promise.all(images.map((image) => {
        image.loading = "eager";
        return image.decode();
      }));
    } catch (error) {
      status.textContent = `Cannot print because a PDF page image failed to load: ${error.message}. Use Open actual PDF to print from the PDF viewer.`;
      return;
    }
    window.print();
  });
  update();
  propagateTheme();
  const targetId = params.get("report");
  const targetPage = params.get("page");
  if (targetId && targetPage) {
    document.getElementById(`${targetId}-page-${targetPage}`)?.scrollIntoView();
  }
}

function initializeReferences() {
  const search = document.querySelector("#reference-search");
  const filter = document.querySelector("#reference-filter");
  const cards = [...document.querySelectorAll(".reference")];
  const status = document.querySelector("#reference-status");
  function update() {
    const term = search.value.trim().toLocaleLowerCase();
    let count = 0;
    cards.forEach((card) => {
      const matches = card.textContent.toLocaleLowerCase().includes(term) &&
        (filter.value === "all" || filter.value === card.dataset.type);
      card.hidden = !matches;
      if (matches) count++;
    });
    status.textContent = `${count} of ${cards.length} independently linked references shown.`;
    document.querySelector("#reference-empty").hidden = count !== 0;
  }
  search.addEventListener("input", update);
  filter.addEventListener("change", update);
  update();
}

if (document.body.dataset.page === "reports") loadReports();
if (document.body.dataset.page === "references") initializeReferences();
