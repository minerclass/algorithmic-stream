# BUILD_LOG.md - The Algorithmic Stream

## 2026-07-07: Project Initialization & Core Specs
- **Goal**: Build an interactive educational game called "The Algorithmic Stream" illustrating the evolution of media ecology, source validation under fast generative conditions, and the need for Friction Dams and Corroboration Lenses.
- **Visuals**:
  - Horizontal scrolling SVG river carrying blocks corresponding to Wood (Orality), Stone (Literacy), Neon (Secondary Orality), Gear (Algorithmic), and Phantom (Tertiary Algorithmicity).
  - Toggleable Friction Dam slowing down the river flow.
  - Mouse-hover Corroboration Lens revealing underlying source citations.
- **Calibration Limits**:
  - `PRODUCTIVE_CHALLENGE = [55, 80]`
  - `BARRIER_ACCESSIBLE_MAX = 20`
- **Required Footnote**:
  - `*Note: All scores, stats, and achievements are illustrative models of the pedagogical friction framework, not validated learning assessment instruments.`

## 2026-07-07: Remote Deployment & Verification
- **GitHub Repository**: Created public repository `minerclass/algorithmic-stream`.
- **Default Branch**: Branch `master` renamed to `main`, set as default branch on remote, and remote `master` deleted.
- **GitHub Pages**: Enabled via REST API. Live URL: `https://minerclass.github.io/algorithmic-stream/`
- **Verification & Cleanup Status**: Upgraded canvas interactions to use pointer events (`pointerdown`, `pointermove`, `pointerleave`) and set `touch-action: none` to support mobile/touch collection. Standardized print report footer to use full dissertation-safe disclaimer text. Verified the bibliography audit logic (`verifiedCount >= 4` threshold checked). Passed local verification.
── QA fixes (2026-07-08): see commit log for the Phase 2 QA-pass fixes; full defect analysis in the session review.

## 2026-07-08: Phase 3 Upgrades
- Added prediction beat before the academic integrity audit runs, asking players how many of the 5 collected sources will verify as authentic.
- Map keys 0–5 for keyboard prediction, and added forecastResult feedback on the final debrief screen.
- Implemented mobile media queries for viewport widths under 480px (scaling down the stream container and main layout padding).
- Verified playthrough and replay with zero console errors.

## 2026-07-12: Dissertation Bridge

- Added a debrief card connecting the bibliography audit to the three current research-question domains.
- Kept the prompts game-specific and linked to the Dissertation Proposal Dashboard instead of copying full research-question wording that may change.
- Explicitly labels the audit as a prompt for the current study rather than a finding from it.
- Local validation confirmed one bridge, three prompts, the correct dashboard link, unique IDs, no horizontal overflow, and zero console errors.
