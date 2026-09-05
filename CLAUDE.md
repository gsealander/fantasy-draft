# Fantasy Draft Board

Single-file vanilla JS/HTML/CSS draft assistant. Open `index.html` directly in a browser (or run `./open.sh`) — no build step, no server, no dependencies. All state lives in `localStorage`.

## What it does

Tracks a live fantasy football draft across three leagues. Upload a rankings CSV per league, then click **Mine** (I drafted them) or **Taken** (someone else did) on each row. Sidebar shows the user's roster slotted into positions. The toolbar has a name/team search box, position filters, and a "Hide taken" toggle for finding players fast mid-draft. **Mine** and **Taken** both have an inline **Undo**.

A **⇄ Sleeper** button connects a league to a live Sleeper draft and marks picks automatically — see "Sleeper sync" below.

An **Insights** toggle layers draft strategy on top of the board — see "Insights" below. It defaults on and persists; switching it off restores the plain board exactly.

A sample file (`sample-rankings.csv`) is included for testing. Its contents are also embedded in `index.html` as `DEFAULT_CSV.dynasty` — see "Bundled rankings" below.

## Phone / travel use

`index.html` is responsive below 820px: the roster sidebar becomes a slide-over drawer (`☰ My Team` button in the toolbar, `body.roster-open`), player rows fold to two lines, and the action buttons stack into thumb-sized targets.

To use it away from the Mac, publish it as a Claude Artifact — a private URL that works from any browser:

```sh
node build-artifact.js   # strips the document wrapper → artifact.html
```

Then publish `artifact.html` as an Artifact. `index.html` stays the single source of truth; `artifact.html` is generated and should not be edited directly. Re-run the build and re-publish to the **same URL** after any change.

Note that state is per-browser `localStorage` — the phone and the Mac do not sync. Draft entirely on one device.

Sleeper sync does **not** work in a published Artifact: the Artifact sandbox's CSP blocks outbound `fetch` to any host, `api.sleeper.app` included. The panel reports it as "could not reach Sleeper". Sync works when `index.html` is opened as a local file or served from a normal host.

## Bundled rankings

`DEFAULT_CSV` maps a league id to `{ name, text }`. On load, `seedLeague()` installs it for any league with no CSV, but only once — it sets `fantasy_draft_seeded_<id>`, so **Clear CSV** and later uploads stick across reloads instead of being re-seeded. Currently only `dynasty` is bundled.

The bundled `sample-rankings.csv` is **synthetic** — invented player names over real team abbreviations and real defenses. It exists so a fresh install has something to render, not to be drafted from; bring your own rankings. It is generated to have genuine tier cliffs and ages straddling every `AGE_CLIFF`, and unlike a typical scraped file it includes K and DEF rows, so it exercises the whole board.

## League configs

Defined in the `LEAGUES` constant in `index.html`. These four are examples — edit, add or remove entries to match your own leagues. Keep the ids stable: `localStorage` is keyed on them, so renaming an id orphans that league's saved picks.

| League | Teams | Starters | Bench | Reserve |
|---|---|---|---|---|
| **Dynasty** (default) | 12 | 1 QB / 2 RB / 2 WR / 1 TE / 2 FLEX / 1 DEF | 10 BN | 3 TAXI |
| **Keeper** | 8 | 1 QB / 2 RB / 3 WR / 1 TE / 2 FLEX / 1 DEF | 7 BN | — |
| **Redraft** | 14 | 1 QB / 2 RB / 2 WR / 1 TE / 1 FLEX / 1 K / 1 DEF | 4 BN | — |
| **Redraft 12** | 12 | 1 QB / 2 RB / 2 WR / 1 TE / 2 FLEX (shown as W/R/T) / 1 DEF | 5 BN | — |

FLEX = RB/WR/TE. Position filter buttons in the toolbar are generated from each league's slot list — a position with no slot in the active league has no filter button.

## CSV format

Expected headers (case-insensitive): `Rank`, `Name`, `Team`, `Pos`, `Age`. Extra columns are ignored. Quoted fields and embedded commas are handled.

`Pos` is normalized to one of `QB/RB/WR/TE/K/DEF`: common aliases map via `POS_ALIASES` (`DST`/`D/ST`/`DEFENSE`→`DEF`, `PK`/`KICKER`→`K`, `HB`/`FB`→`RB`, etc.). Rows with a blank `Pos` are skipped; rows with an unrecognized `Pos` are **kept but not lost** (they land on the bench and only show under the "All" filter). Both cases are surfaced as a non-blocking `⚠` notice next to the CSV name.

Players are sorted by the `Rank` column; a missing or non-numeric `Rank` falls back to file order. Positional rank (`posRank`) is computed after sort.

## Insights

Everything here is gated on `S.insights` (persisted as `fantasy_draft_insights`, default on). With it off, `renderNeeds`/`renderBoard` skip every insight branch and `body.no-insights` restores the original column widths — the escape hatch if it's noise mid-draft.

**Needs strip** (`renderNeeds`, above the count bar) — one cell per league position showing how many the user has, how many the league's slots require, a status, and the tier cliff. Status comes from `needStatus`, derived from `slotDemand(pos)` (`req` = dedicated slots, `flex` = multi-position slots that accept the position):

| Status | Meaning |
|---|---|
| `NEED` | `have < req` — can't field a legal lineup |
| `OK` | `have < req + flex + 1` — starters covered, depth still useful |
| `LOW` | over-stocked, spend picks elsewhere |
| `LATE` | K/DEF before the roster is nearly full (`myPicks.length < totalSlots - 2`) |

**Positional tiers** (`computeTiers`, called at the end of `parseCSV`) — within each position, a tier break is a gap in overall rank between consecutive players of at least `max(4, medianGap * 2)`. The threshold derives from the position's own median gap, so it adapts to any rankings file instead of assuming a fixed tier size. Capped at `MAX_TIERS` (12); if the cap is hit, the merged tail is flagged `p.deep` and shown as "deep pool" rather than a number.

On `sample-rankings.csv` this finds 4 QB tiers, 3 RB, 5 WR and 4 TE, with TE tier 1 two players deep before a 14-pick gap. K and DEF stay a single tier, which is correct — neither is meaningfully tiered.

Tier **separators** only render in a position-filtered view (in "All", six positions' tiers interleave meaninglessly); the "All" board shows a `T<n>` chip per row instead.

**Age cliffs** — `AGE_CLIFF` (`RB 27 / WR 29 / TE 30 / QB 32`) highlights the age column. Only applies to leagues with `longTerm: true` in their config (dynasty, keeper — not redraft).

**Best available** — `starIds` puts a ★ on the top-ranked available player at each position currently at `NEED`.

## Sleeper sync

Follows a live Sleeper draft and applies every pick to the board: the user's picks are slotted onto the roster, everyone else's are marked taken. Per league — each league can point at a different draft, or none.

**No auth token.** Sleeper's `/v1` draft endpoints are unauthenticated and answer with `Access-Control-Allow-Origin: *`, so the page calls them straight from the browser. The session token visible in dev tools is a credential to the whole Sleeper account and buys nothing here; it is never asked for, stored or sent.

**Connecting** (`openSleeper` panel) — either path:
- Username → `/user/<name>` → `/user/<id>/leagues/nfl/<season>` → `/league/<id>/drafts`, presented as a picker. Season comes from `/state/nfl`, falling back to `previous_season` so the list isn't empty in the offseason.
- Paste a draft link or id (`parseDraftId` pulls the first 6–25 digit run) → `/draft/<id>`. Enter the username too, or every pick lands as *taken*.

Config is stored per league at `fantasy_draft_sleeper_<id>` as `{ draftId, userId, username, leagueName, mySlot, auto }` and hangs off `LEAGUE_STATE[id].sleeper`.

**Polling** — `sleeperSync` reads `/draft/<id>/picks` every 6s (`SLEEPER_POLL_MS`), backing off to 30s after an error and retrying at that rate until one succeeds. That request is sent with a cache-busting `_=<timestamp>` param (`sleeperGet(path, fresh)`): Sleeper serves picks through Cloudflare with `s-maxage=300, stale-while-revalidate=300`, so without it the edge returns a pick list up to five minutes stale regardless of poll rate. Discovery calls are left cacheable. `SLEEPER` holds all runtime state; `activateSleeperForLeague()` resets it and restarts polling on load and on every league switch. A response that lands after the user switched leagues is discarded.

**Whose pick** (`sleeperIsMine`) — `picked_by === conf.userId`. Autopicked and commissioner-entered picks come back with an empty `picked_by`, so the fallback compares `draft_slot` against the `mySlot` read from the draft's `draft_order` at connect time.

**Matching** (`matchSleeperPick`) — each pick carries a `metadata` blob with name, position and team, so the multi-megabyte `/players/nfl` dump is never downloaded. `normName` lowercases, strips accents, punctuation and generational suffixes (`Jr/Sr/II/III/IV/V`), so `Ja'Marr Chase` matches `Ja’Marr Chase` and `Travis Etienne` matches `Travis Etienne Jr.`. Duplicate names are disambiguated by position, then team, then rank order. Defenses match on the team abbreviation, falling back to the nickname inside the player's name.

**Sync only ever adds.** It never removes a player the user added by hand. Three outcomes are reported in the panel instead:
- *unmatched* — drafted on Sleeper but absent from the rankings CSV. The bundled sample uses invented player names, so a live Sleeper draft matches almost nothing against it until a real rankings file is uploaded.
- *conflict* — the player is on the user's roster locally but Sleeper has someone else drafting them, or the roster is full
- *error* — network, 404, 429 or timeout, shown in the toolbar pill and the panel

**Reset Draft** pauses sync first when it is live, since polling would refill the board within seconds.

## State model

```js
LEAGUE_STATE[id] = {
  csvText,   // raw CSV string
  csvName,   // filename for display
  players,   // parsed, sorted by rank, with posRank + tier/deep computed
  taken,     // [playerId, ...] — others drafted them
  myPicks,   // [{ id, slot }, ...] — slot is the roster slot id
  warn,      // { skipped, unknownPos } from last parse, or null (not persisted)
  sleeper,   // Sleeper draft binding, or null — see "Sleeper sync"
}
```

Corrupt persisted state is tolerated: non-array `taken`/`myPicks` and malformed pick objects are discarded on load rather than throwing. `localStorage` write failures (quota/blocked) show a persistent `⚠ Not saved` warning in the toolbar instead of silently losing picks.

`localStorage` keys:
- `fantasy_draft_active_league` — currently selected league id
- `fantasy_draft_league_<id>` — `{ taken, myPicks, csvName }` per league
- `fantasy_draft_csv_<id>` — raw CSV per league
- `fantasy_draft_insights` — `'0'` to disable the insights layer (absent/`'1'` = on)
- `fantasy_draft_sleeper_<id>` — Sleeper draft binding per league (absent = not connected)

`S` holds UI-only state: `activeLeague`, `filter` (position filter), `hideTaken` toggle, `search` (name/team query), `insights` toggle. `activeLeague` and `insights` are persisted across reloads; switching leagues clears `filter` and `search`.

Uploading a CSV replaces only the active league's CSV and picks; other leagues are untouched. **Reset Draft** clears the active league's picks but keeps its CSV; **Clear CSV** drops both, returning that league to the empty "No CSV loaded" state.

## Slot assignment (`assignSlot`)

When the user clicks **Mine**, the player goes into the first available slot in this priority order:
1. Single-position slot matching their position (QB → QB, RB → RB1/RB2, etc.)
2. Multi-position slot that accepts them (FLEX)
3. Any null-position slot (Bench, then Taxi)

Slot order in the `LEAGUES` config determines fill order — starters come before bench, bench before reserve.
