# F1 Telemetry Dashboard & Race Replay

A Formula 1 dashboard built with React and TypeScript, centered on a race replay
engine that reconstructs a completed Grand Prix from real telemetry and plays it
back on an interactive circuit map — live timing, tyre strategy, and per-driver
telemetry included. A machine learning side-project, documented separately, is
building toward predicting lap times during that replay.

## What's in here

- **Dashboard** — standings, driver profiles, race results, and a calendar screen.
  These run on static sample data and aren't wired to any live source.
- **Race telemetry page** (Live Telemetry tab) — pick any 2024-2026 race: the
  classification, winner, fastest lap and sectors, speed trap and the winner's
  lap-by-lap pace all switch to that race. They come from per-race files in
  `public/races/`, built offline from FastF1, so they work without OpenF1.
- **Race replay** (under the Live Telemetry tab) — the real part of the project.
  Fetches actual position and car telemetry for a race from the
  [OpenF1](https://openf1.org) API, compresses it into a form the browser can hold
  in memory without choking, and plays it back on a canvas-rendered track map with
  a running leaderboard, pinnable driver telemetry cards, and full playback
  controls (variable speed, scrubbing, DRS zone overlay). A season/race selector
  covers every 2024-2026 race; races with stored model predictions show the
  predicted vs actual lap time on each pinned driver's card.
- **ML pipeline** (`ml/`) — a separate, in-progress research project to predict
  per-lap lap times using data pulled from [FastF1](https://docs.fastf1.dev). See
  [`RESEARCH_PAPER.md`](RESEARCH_PAPER.md) for the write-up and
  [`ml/RESEARCH_LOG.md`](ml/RESEARCH_LOG.md) for a running log of issues hit and
  decisions made along the way. Every dataset column is explained in
  [`ml/DATA_DICTIONARY.md`](ml/DATA_DICTIONARY.md).

## Running the dashboard

**Prerequisites:** Node.js

```bash
npm install
npm run dev
```

Opens at `http://localhost:3000`. Click **Load Replay** under the Live Telemetry
tab to pull a real race (pick the season and race first) and watch it play back.
While a live F1 session is running, OpenF1 refuses requests without an API key,
so replays only load outside session hours.

## Running the ML pipeline

**Prerequisites:** Python 3.11+

```bash
cd ml
python -m venv .venv
.venv/Scripts/activate   # .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
python src/fetch_season.py 2026
```

This builds `ml/data/raw/laps_<year>_raw.csv` — one row per driver per lap, for
every race completed so far in the given season. First run is slow (FastF1
downloads and caches everything locally); subsequent runs reuse the cache.

## Project structure

```
src/                    React app
  components/            screens + the RaceReplay panel
  replay/                 OpenF1 client, data packing, track geometry, playback clock,
                          race list (raceCatalog*.ts) and stored-prediction loader
public/predictions/      per-race model predictions the replay reads (<year>_R<round>.json)
public/races/            per-race results and pace for the telemetry page (<year>_R<round>.json)
ml/                      Python ML pipeline (separate from the app above)
  src/fetch_season.py      pulls one season of FastF1 lap data
  src/fetch_practice.py    pulls the practice sessions into a separate table
  src/validate_dataset.py  automatic checks on a built lap table
  src/combine_seasons.py   stacks the per-season files into one training file
  src/export_predictions.py   stored model replay -> public/predictions/<year>_R<round>.json
  src/export_race_summaries.py results + laps -> public/races/<year>_R<round>.json
  src/export_race_catalog.py  FastF1 schedule -> src/replay/raceCatalog.generated.ts (run last)
  data/raw/                 generated training data (not committed)
  RESEARCH_LOG.md           dated log of issues and decisions
RESEARCH_PAPER.md        write-up of the project and its methodology
```
