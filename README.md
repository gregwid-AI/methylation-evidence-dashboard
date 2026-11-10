# Methylation Evidence Dashboard

Static, public document-review website with an executive summary, complete redacted
PDF reports, searchable page-by-page transcripts, and linked evidence references.

## Content and privacy

The original attachments are **not** included. Publication copies remove patient
names, testing identifiers, and care-provider details, including PDF metadata.
Clinical detail remains at the owner's request. These are redacted copies, not a
guarantee of anonymity. A public repository and GitHub Pages site can be copied.
`noindex` and `robots.txt` discourage indexing; they are not access controls.

Source protocols, doses, targets, and outcome assertions remain in the full reports
for review, not as endorsed medical guidance. Editorial summaries distinguish
source claims from independently linked evidence. No underlying genetic-testing
report, measured lab values, or longitudinal patient outcome dataset was supplied.

## Hosting

Serve this directory as a static website. There are no build dependencies,
third-party scripts, analytics, external fonts, cookies, or application backend.
JavaScript enables source-text and reference search, theme switching, and print
controls. Direct PDF downloads and the executive/reference pages also work without
JavaScript.

GitHub Pages is configured to deploy the `main` branch at the repository root.
Use relative links so the site works under a GitHub Pages project path.

## Updating

Edit `index.html`, `references.html`, `styles.css`, and `app.js` for presentation.
`reports.json` and `downloads/report-*.pdf` are redacted publication derivatives;
never replace them with unredacted source attachments. Check PDF text layers,
metadata, and visible pages after any regeneration. Keep the report page counts
and coverage metrics synchronized if source documents change.

Reference links and the claim audit were checked November 10, 2026. This is a
bounded document review, not an exhaustive or continuously updated medical review.
