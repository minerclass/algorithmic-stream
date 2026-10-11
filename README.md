# The Algorithmic Stream

A lateral-reading river game. Sources drift past on a current that speeds up through five media reaches. The player nets what looks useful, verifies it with three lateral-reading moves, cites five, and submits the bibliography for an audit that reveals what held and why.

**Live:** https://minerclass.github.io/algorithmic-stream/

Part of the [pedagogical friction games hub](https://minerclass.github.io/games-hub/). Pairs with [Keeper of the Word](https://minerclass.github.io/orality_game/) and [Echoes](https://minerclass.github.io/echoes/), which walk the same five environments.

## The run

The research question is fixed: *What happened on the night the levee broke at Miller's Crossing in March 1871, and how do we know?* Miller's Crossing is invented. Every source in the river is an illustrative composite. None of them can be cited for real, and the game says so on the title screen and in the footer. The lateral-reading moves are the real part.

1. **Net.** Click a card in the river, or choose it from the list under the water. The dock holds four at a time.
2. **Read laterally.** Each docked source offers three moves: *Who is behind it?*, *What is the evidence?*, and *What do other sources say?* Each reveals a clue. Clues marked in gold point somewhere. In a timed run, each move costs twelve seconds of the deadline.
3. **Decide.** Cite it or let it go. Five citations fill the bibliography.
4. **Raise the dam.** Hold the dam button or the space bar to slow the current while you read. The dam drains while held and refills while released.
5. **Resist the autopilot.** A shimmering button offers to fill the bibliography instantly with the most prominent sources in the current. It is allowed. It prefers what is loud and late.
6. **Forecast, then audit.** Before the audit, call how many citations will hold. The bibliography flips one entry at a time. The debrief gives a rank, a score, a pattern readout, and a verdict for every citation and every source let go.

### Five reaches

The river moves from Voice (primary orality) through Ink (literacy) and Signal (secondary orality) to Feed (algorithmic secondary orality) and Phantom (tertiary algorithmicity). Each reach changes the bank scenery, the water, the speed of the current, and the mix of sources that spawn. In a timed run the reaches advance as the deadline is spent, so reading moves the river on. In an untimed run they advance every two decisions.

The distinction the last two reaches turn on is what becomes algorithmic. In Feed the contributions are still human and the system decides whose circulate. In Phantom the system produces the words as well as ranking them. Both reaches contain sources that hold: a library account pointing at its own scan, and an archive's machine-assisted transcript with a named reviewer and a link to the audio. Machine-touched is not the same as fabricated. What matters is whether the path back to the original exists and whether a person stands behind it.

### Modes and parameters

- **Begin the run** starts a five-minute timed run. **Untimed run** has no clock and no move cost.
- `?start=timed` or `?start=untimed` skips the title screen.
- `?motion=reduce` forces reduced motion. The title screen also cycles between system, reduce, and full. The choice is kept in browser-local storage and nowhere else.

### Ranks

Archivist, Corroborator, Reader, Skimmer, Drifter. The rank reflects both outcome (how many citations held) and process (moves per citation). A fast run that happens to hold is a Skimmer, not an Archivist. All scores and ranks are illustrative models of the pedagogical friction framework, not validated learning assessment instruments.

## Accessibility

- Every river card is also a button in the list under the water, so the game is playable without a pointer.
- Keys: Space holds the dam, 1 to 3 run the moves on the selected dock card, C cites, X lets go, M toggles sound, Esc pauses. The dam button also toggles with Enter for players who cannot hold a key.
- Sound is off by default and synthesized in the browser. Every sound cue has a visible equivalent.
- Reduced motion removes particles, bobbing, shimmer, and the fly-to-dock animation, and follows the system preference at startup.
- Reach, netting, moves, decisions, and audit results are announced through a polite live region. Screen-reader output has not been tested with a real screen reader; treat that as unverified.
- Shapes and labels distinguish the reaches, so colour is never the only signal.

## Files

| File | Responsibility |
| --- | --- |
| `index.html` | Title, run, debrief, and modal markup |
| `styles.css` | Layout, HUD, dock, bibliography, debrief, print, motion rules |
| `game.js` | River renderer, spawning, dam, dock and moves, autopilot, audit, scoring, debrief |
| `sources.js` | The source bank: five reaches, fourteen sources, three moves and a verdict each |
| `sources.test.cjs` | Regression checks on the source bank |
| `classic/` | The 2026 version: canvas river with a friction dam, corroboration lens, and autopilot bypass. Kept for older links |

Static HTML, CSS, and JavaScript. No build step, no framework, no network calls beyond the shared ecosystem token sheet.

### Checks

```bash
node --check game.js
node --check sources.js
node --test sources.test.cjs
```

Serve locally with any static server, for example:

```bash
python3 -m http.server 4179 --bind 127.0.0.1
```

## Privacy

Public educational resource. Nothing is stored or transmitted except a browser-local motion preference. Do not add student data, staff data, participant material, credentials, or internal district information.

## License and attribution

Game code, text, and procedural scenery are Micah J. Miner's. The shared design tokens are linked from `minerclass.github.io/tokens.css`.
