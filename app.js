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
  error.textContent = "The web transcript could not be loaded. Reload this page or use the redacted PDF links below.";
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

function markedText(container, text, term) {
  container.replaceChildren();
  if (!term) {
    container.textContent = text;
    return;
  }
  const lower = text.toLocaleLowerCase();
  let start = 0;
  let index;
  while ((index = lower.indexOf(term, start)) !== -1) {
    container.append(document.createTextNode(text.slice(start, index)));
    const mark = document.createElement("mark");
    mark.textContent = text.slice(index, index + term.length);
    container.append(mark);
    start = index + term.length;
  }
  container.append(document.createTextNode(text.slice(start)));
}

async function loadReports() {
  const content = document.querySelector("#report-content");
  const status = document.querySelector("#report-status");
  const search = document.querySelector("#report-search");
  const filter = document.querySelector("#report-filter");
  const expand = document.querySelector("#expand-pages");
  const params = new URLSearchParams(window.location.search);
  let reports;
  try {
    const response = await fetch("reports.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    reports = await response.json();
    if (!Array.isArray(reports) || reports.length !== 2 ||
        reports.some((report) => typeof report.title !== "string" ||
          !Array.isArray(report.pages) ||
          report.pages.some((page) => typeof page.text !== "string"))) {
      throw new Error("Unexpected report data format");
    }
  } catch (error) {
    showError(content, status, `Report loading failed: ${error.message}`);
    search.disabled = true;
    filter.disabled = true;
    expand.disabled = true;
    document.querySelector("#print-reports").disabled = true;
    return;
  }
  if (reports.some((report) => report.id === params.get("report"))) {
    filter.value = params.get("report");
  }

  const views = reports.map((report) => {
    const section = document.createElement("section");
    section.className = "source-report";
    section.id = report.id;
    const head = document.createElement("div");
    head.className = "source-head";
    const title = document.createElement("h2");
    title.textContent = report.title;
    const download = document.createElement("a");
    download.className = "button";
    download.href = report.download;
    download.download = `${report.id}.pdf`;
    download.textContent = `Download redacted PDF / ${report.pageCount} pages`;
    head.append(title, download);
    section.append(head);
    const pages = report.pages.map((page) => {
      const details = document.createElement("details");
      details.id = `${report.id}-page-${page.number}`;
      details.open = page.number === 1 ||
        (filter.value === report.id && String(page.number) === params.get("page"));
      const summary = document.createElement("summary");
      summary.textContent = `Page ${page.number} of ${report.pageCount}`;
      const link = document.createElement("a");
      link.className = "page-link";
      link.href = `reports.html?report=${report.id}&page=${page.number}#${details.id}`;
      link.textContent = "Link to page";
      summary.append(link);
      const text = document.createElement("pre");
      text.className = "source-text";
      text.textContent = page.text;
      details.append(summary, text);
      section.append(details);
      return { details, text, source: page.text };
    });
    content.append(section);
    return { section, id: report.id, pages };
  });
  const empty = document.createElement("p");
  empty.className = "empty";
  empty.textContent = "No pages match. Clear the search or select both reports.";
  content.append(empty);

  function update() {
    const term = search.value.trim().toLocaleLowerCase();
    let visiblePages = 0;
    let visibleReports = 0;
    views.forEach((view) => {
      const selected = filter.value === "all" || filter.value === view.id;
      let found = 0;
      view.pages.forEach((page) => {
        const matches = !term || page.source.toLocaleLowerCase().includes(term);
        page.details.hidden = !selected || !matches;
        if (selected && matches) {
          found++;
          markedText(page.text, page.source, term);
          if (term) page.details.open = true;
        }
      });
      view.section.hidden = found === 0;
      visiblePages += found;
      if (found) visibleReports++;
    });
    empty.hidden = visiblePages !== 0;
    status.textContent = `${visiblePages} of 9 pages shown across ${visibleReports} report${visibleReports === 1 ? "" : "s"}. All clinical content is source-reported.`;
    expand.textContent = "Expand all pages";
  }
  search.addEventListener("input", update);
  filter.addEventListener("change", update);
  expand.addEventListener("click", () => {
    const visible = views.flatMap((view) => view.pages)
      .filter((page) => !page.details.hidden);
    const open = visible.some((page) => !page.details.open);
    visible.forEach((page) => { page.details.open = open; });
    expand.textContent = open ? "Collapse all pages" : "Expand all pages";
  });
  document.querySelector("#print-reports").addEventListener("click", () => {
    views.flatMap((view) => view.pages).forEach((page) => {
      if (!page.details.hidden) page.details.open = true;
    });
    expand.textContent = "Collapse all pages";
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
