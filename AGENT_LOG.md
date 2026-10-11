# Agent Log

Append-only record of automated and agent-assisted changes to this repository.
Newest entry first. No participant data, committee or faculty names, credentials,
or tokens.

---

## 2026-10-11 - Version 2: a run-based river game with lateral-reading moves

Rebuilt the game so it plays like a game rather than a toggle panel. The 2026 version is
kept unchanged at `classic/index.html` so older links and hub cards keep working.

**What changed.** Title screen with the research question and a tutorial. A canvas river
with five reaches (Voice, Ink, Signal, Feed, Phantom): per-reach bank scenery, sky and
water palettes that cross-fade, reflections of bank lights, wave crests, foam, a hold-to-raise
dam with a draining charge, and floating source cards drawn as era-specific glyphs. Netting
sends a card flying into the dock. Each docked source offers three lateral-reading moves
(who, evidence, others) that reveal clues; the corroboration lens, which revealed the verdict
on hover, is gone. An autopilot offer fills the bibliography with the most prominent sources.
A forecast beat, a one-at-a-time flip reveal, a rank and score, a pattern readout, and a
verdict for every citation and every source let go.

**Source bank.** `sources.js` holds fourteen illustrative sources set in the invented town of
Miller's Crossing: eight hold, six fail. Two of the sources that hold live in the Feed and
Phantom reaches, so machine-touched is never equated with fabricated. The title screen,
footer, and README all state that the sources are invented and cannot be cited.

**Verified.** Timed and untimed runs, keyboard-only play, dam hold and exhaustion, autopilot,
forecast, reveal, debrief, pause and resume, reduced motion, and the phone layout (no
horizontal overflow at 375px) were played through in the desktop app's browser pane with
zero console errors. Node was not on this computer, so `node --check` and the new
`sources.test.cjs` were not run here; the source bank was validated in the browser instead
(unique ids, known reaches, three moves and a verdict each).

**Not done here.** The games hub card still describes the corroboration lens; it needs a
one-line update in `minerclass/games-hub`. Screen-reader output is unverified.

---

## 2026-09-01 - Adopt the shared ink; stream gradient kept

Links the shared token file and points the primary text colour at the shared ink with a
pre-adoption fallback.

**Ground and muted green kept local.** The green stream gradient and `--text-muted`
(`#86efac`) are this microsite's subject matter, not incidental styling.

**One honest tradeoff.** Primary text moves from 19.45 to **17.55** against the ground and
from 9.28 to 8.38 against the green gradient stop. Both are far above any threshold, so the
change is a small loss of headroom in exchange for joining the shared ink.

**Verified.** Zero contrast failures with the token sheet on and off; tightest pair 4.63.

**Note.** A second `<style>` block near line 1074 is inside a JavaScript template for the
printable bibliography certificate, not page CSS. Tag-balance and style checks will see it.

**Measurement limitation, stated plainly.** This is an interactive piece: most of its
content appears only after play begins, so the contrast probe covered the landing screen
(26 text-bearing elements) and not deeper game states. Those are unmeasured, not verified
clean.
