# Fantasy Draft Board

A single-file draft assistant for fantasy football. Open `index.html` in a browser — no build step, no server, no dependencies, no accounts. Everything lives in `localStorage` on your own machine.

![no build step](https://img.shields.io/badge/build-none-brightgreen) ![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)

## What it does

Upload a rankings CSV, then work the board during your draft. Click **Mine** when you draft someone, **Taken** when anyone else does, and the board keeps up: your roster fills into real starting slots, taken players grey out or disappear, and the counts stay honest. Search by name or team, filter by position, hide taken players.

It tracks several leagues side by side, each with its own rankings file and its own picks — useful when you have back-to-back drafts in different formats.

### Sleeper sync

Point a league at a live [Sleeper](https://sleeper.com) draft and it marks picks for you. Your picks go onto the roster, everyone else's are marked taken, and the board updates within a few seconds of each pick.

**No login and no auth token.** Sleeper's draft endpoints are public and CORS-open, so the page reads them directly from your browser. Connect with just your Sleeper username, or paste a draft link. Nothing is sent anywhere else, and there is no server in the middle — the page talks to Sleeper and to nothing else.

Sync only ever *adds* information. It will never pull a player off a roster you filled by hand; disagreements are reported as conflicts for you to settle.

### Insights

An optional layer over the board, on by default and easily switched off:

- **Needs strip** — how many of each position you have against what your lineup requires, with a `NEED` / `OK` / `LOW` / `LATE` status per position.
- **Positional tiers** — tier breaks found from gaps in the rankings themselves, so they adapt to whatever file you upload rather than assuming a fixed tier size. Shows you when a position is about to fall off a cliff.
- **Age cliffs** — highlights players past the age where their position's dynasty value drops. Only applies to leagues marked long-term.
- **Best available** — a ★ on the top player at each position you actually need.

## Getting started

```sh
git clone https://github.com/gsealander/fantasy-draft.git
cd fantasy-draft
./open.sh          # or just open index.html
```

Upload your own rankings CSV with the **↑ Upload CSV** button. Expected headers, case-insensitive:

```
Rank, Name, Team, Pos, Age
```

Extra columns are ignored, quoted fields and embedded commas are handled, and `Pos` accepts the usual aliases (`DST`/`D/ST` → `DEF`, `PK` → `K`, `HB`/`FB` → `RB`, and so on). Players sort by `Rank`; a missing or non-numeric rank falls back to file order.

`sample-rankings.csv` ships with the project so a fresh install has something to render. It is **synthetic** — invented player names over real team abbreviations — so replace it with a real rankings file before you draft.

## Configuring your leagues

Edit the `LEAGUES` constant near the top of the script in `index.html`. Each league declares its roster slots in fill order; starters first, then bench, then any reserve/taxi. The four shipped configs are examples, not requirements.

```js
myleague: {
  id: 'myleague',
  name: 'My League (10-team)',
  teams: 10,
  longTerm: false,                    // true enables dynasty age cliffs
  slots: [
    { id: 'QB',   label: 'QB',   pos: ['QB'],           count: 1, section: 'Starters' },
    { id: 'RB',   label: 'RB',   pos: ['RB'],           count: 2, section: 'Starters' },
    { id: 'FLEX', label: 'FLEX', pos: ['RB','WR','TE'], count: 2, section: 'Starters' },
    { id: 'BN',   label: 'BN',   pos: null,             count: 6, section: 'Bench'    },
  ],
},
```

Position filter buttons are generated from the slot list, so a position with no slot in a league gets no button. Keep league ids stable once you have picks saved — `localStorage` is keyed on them.

## Phone use

The board is responsive: below 820px the roster becomes a slide-over drawer and the action buttons grow into thumb-sized targets.

`node build-artifact.js` produces `artifact.html`, a wrapper-free copy for publishing as a hosted page. Note that Sleeper sync does not work from a sandboxed Artifact host, which blocks outbound network requests — it works when the page is opened as a local file or served normally.

State is per-browser `localStorage`, so devices do not sync with each other. Draft on one device.

## Privacy

There is no backend, no analytics, no telemetry, and no account. Your rankings and picks never leave your browser. The only network requests the page ever makes are to Sleeper's public API, and only after you connect a draft yourself.

## License

MIT — see [LICENSE](LICENSE).
