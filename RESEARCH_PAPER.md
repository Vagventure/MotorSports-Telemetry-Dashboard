# Reconstructing and Predicting Formula 1 Race Pace

*A browser-based race replay engine and a lap-time prediction pipeline*

## Abstract

Formula 1 publishes detailed timing and telemetry data for every session through
public APIs, but that data arrives as raw, disconnected tables — not something a
fan or a student can point a browser at and watch. This project has two parts that
share one goal: turning that raw data into something usable. The first part is a
race replay engine, built in React and TypeScript, that fetches a completed race's
real position and telemetry data and plays it back like a live broadcast, with a
track map, a running leaderboard, and per-driver telemetry. The second part, still
in progress, is a machine learning pipeline that predicts each driver's next lap
time during that replay, trained on three seasons of real lap data. A first model,
built by a collaborator, has been tested on races it never saw. In normal races it
beats a simple three-lap average by 4 to 12%, and its weaknesses are measured and
documented in Section 6, along with the plan to fix them. Both halves
turned out to involve more hidden problems than expected — data that looks right
but isn't, limits that shape the whole design, and one mistake in particular, data
leakage, that would have made the prediction model look perfect while actually
being useless. This paper documents what was built, how, and what went wrong along
the way.

## 1. Introduction

Two public data sources make a surprising amount of real Formula 1 data available
for free: [OpenF1](https://openf1.org), a REST API with no authentication required,
and [FastF1](https://docs.fastf1.dev), a Python library that wraps F1's own timing
systems. Between them, you can get a car's exact position on track several times a
second, its speed and gear and throttle, every lap time, every tyre choice, and the
weather at the time — for any session since 2023 (OpenF1) or several years further
back (FastF1).

What neither of these gives you is a finished product. They give you data. This
project builds two things on top of that data: something to *watch* (the replay
engine) and something to *predict with* (the lap-time model). The two halves use
different data sources for a deliberate reason, covered in Section 3.

## 2. Data sources

| | OpenF1 | FastF1 |
|---|---|---|
| Used for | Race replay (runs in the browser) | Lap-time model training data |
| Access | Plain REST API, works directly from JavaScript | Python library only |
| Rate limit | 3 requests/second, 30/minute (free tier) | No hard limit, but a slow first download per session |
| Strongest for | Live position data (x/y coordinates, ~4Hz) | Lap-level detail (tyre age, flags, results) |

The replay engine needs to run entirely in a user's browser, so it needs an API
that a browser can call directly — that's OpenF1, which allows cross-origin
requests from anywhere. The ML pipeline runs offline, as a batch job that builds a
training file once, so it doesn't need that constraint, and FastF1 gives richer
per-lap detail (tyre age, track status, official results) that OpenF1 doesn't
expose in the same clean form.

## 3. The replay engine

### 3.1 What it does

Under the dashboard's Live Telemetry tab, a user can load a real, completed race
and watch it replay: cars move on a circuit map at their actual recorded
positions, a leaderboard updates live, and up to three pinned drivers show live
speed, gear, DRS state, and throttle/brake bars — all driven by real recorded
data, not simulation.

### 3.2 The core engineering problem: too much data for a browser tab

A full race generates roughly 46,000 position samples per driver. Measured against the
API, one driver's full-race position history is 46,538 samples and 5.9 MB of raw JSON text;
across 20 drivers that is about 118 MB for positions alone, and about 266 MB if every driver's
car telemetry (speed, throttle, gear) is fetched as well. Parsed into ordinary JavaScript
objects it would occupy more than the text does (not measured), which is a lot for a browser tab
to hold for a feature that is meant to feel instant.

The fix was to avoid keeping that data as objects. Each API response is parsed once, its
numbers are copied into fixed-size **typed arrays** (one flat array per field: time, x, y,
instead of one object per sample), and the parsed JSON is immediately discarded. At 12 bytes
per sample (three 4-byte numbers), one driver's positions take about 0.56 MB, roughly a tenth
of the JSON text (by arithmetic from the measured sizes; heap use in a running browser was not
profiled). Typed arrays are also contiguous blocks of numbers, so reading and interpolating a car's
position during playback needs no per-sample objects. The frame rate was not profiled, and the
render loop still creates a small temporary object for each car on each frame, so the claim is
a smaller, simpler data store, not an allocation-free or measured-60-fps loop. Car telemetry is
fetched only for drivers pinned to the HUD, so the app never holds the full 266 MB.

### 3.3 Loading strategy

OpenF1's free tier caps requests at 3 per second and 30 per minute. A full grid's
worth of data is about 27 requests, so loading is split into two tiers: seven small
metadata calls (drivers, results, laps, weather) load first, giving a usable
leaderboard in under a second, and then each driver's position data streams in
one at a time, front-runners first, so the track map starts showing movement long
before the last car's data has arrived.

### 3.4 Data that had to be derived, not fetched

Two things the replay needed don't exist as API fields at all:

- **The shape of the circuit.** There is no "track outline" endpoint. The circuit
  is drawn by taking one clean, representative lap from the race itself and using
  its recorded path as the track's centreline.
- **DRS zones.** Also not published directly. Inferred by checking, at every point
  around the track, whether multiple different drivers had their DRS open there —
  a consistent pattern across drivers marks a real zone rather than one car's
  isolated telemetry blip.

### 3.5 Bugs found while testing against real data

- **Wrong race-start time.** The session's listed start time is not necessarily
  when the race actually went green — Monaco 2024 was red-flagged at the start,
  delaying the real green flag by 44 minutes. Using the listed start time as the
  replay's zero-point made the lap counter and grid order wrong for the first part
  of the replay. Fixed by anchoring the clock to the first recorded green-flag lap
  instead of the session's listed start.
- **Dropped starting grid positions.** Starting-grid position data is timestamped
  *before* the session's official start time (sometimes by nearly an hour). A naive
  filter that discarded anything before the race start silently dropped every
  driver's starting position, which made the early leaderboard wrong until the
  first overtake. Fixed by treating position data as state that persists from
  before the clock starts, not as an event that only matters if it happens after.

### 3.6 Choosing a race, and showing stored predictions

A season and race selector covers every race from 2024 to 2026. The race list is generated offline from FastF1's schedule, so
it needs no network call. The OpenF1 identifier for a race is not stored; it is looked up by date when the race is loaded.
The rest of the telemetry page (classification, winner, fastest lap and sectors, speed-trap peak, and the winner's lap-by-lap
pace) comes from one small file per race, also built offline from FastF1. The page therefore shows real results even when
OpenF1 cannot be reached.

Model predictions follow the same pattern. They are computed once per race and stored as a file (29 KB for Silverstone 2026);
the browser only reads them. Each pinned driver's card shows the predicted time for the lap in progress. Once that lap is
finished, it shows the predicted and actual times and the difference. The actual time never appears before the lap is over,
and safety-car, VSC and pit laps carry a label instead of an error colour, because the model was not trained on them
(Section 6.4). So far only Silverstone 2026 has stored predictions.

## 4. The lap-time prediction pipeline

### 4.1 Goal

Predict each driver's lap time, lap by lap, while an already-completed race is
being replayed — effectively simulating what a live prediction would have looked
like, using real historical data as the test bed.

### 4.2 Current dataset

Built from FastF1, covering every completed round of the 2024, 2025 and 2026 seasons at the time
of writing: **64 races, 71,674 lap-rows, 57 columns** (2024: 24 races, 26,604 laps; 2025: 24 races,
26,689 laps; 2026 so far: 16 races, 18,381 laps). One row is one driver's one
lap. Columns are ordered in six groups, so it is always clear where a value came from
(every column is explained in [`ml/DATA_DICTIONARY.md`](ml/DATA_DICTIONARY.md)):

1. **Identity** — season, round, race, country, driver, team
2. **Target** — the lap time we want to predict
3. **Reported, known before the lap** — grid and qualifying position and time, weather at
   the start of the lap, and the lap's tyre state (compound, tyre age, stint)
4. **Reported, measured during the lap** — sector times, four speed readings, running
   position, flag state and pit markers. Kept in one contiguous block because these can only
   be used from the *previous* lap (Section 5.1), plus a small block of FastF1's data-quality
   flags used only to filter rows
5. **Calculated** — exact arithmetic on reported data: previous lap time, the gap to the
   car directly ahead at the start of the lap (a traffic measure), the fraction of the race completed, total laps,
   constructor points before the race, qualifying gap to pole, and recent-form pace for
   each driver and team (average pace over their previous three races, relative to the
   field, so a slow track and a fast one are comparable)
6. **Estimated** — approximations, because the real value is not published: fuel load
   (derived from lap number and a burn-down from ~110 kg in 2024-25 or ~70 kg in 2026, treated as a shape, not an exact
   weight), and six numbers describing each circuit: its length (integrated from car speed, a few
   percent low) and its character (top speed, slowest corner, average speed, share of the
   lap at full throttle, and number of braking zones), all taken from qualifying telemetry so they
   are known before the race, and that gap to the car ahead converted to metres

The derived columns (groups 5 and 6, nineteen in all) carry a `DRI_` prefix in the data files, so a value we
computed can never be mistaken for one that F1 reported.

The raw pull and any data-cleaning or modeling decisions are kept as two separate
steps on purpose — nothing is filtered or dropped at fetch time — so that a
filtering rule can be changed later without re-fetching anything.

### 4.3 How the dataset is gathered

The training data is not downloaded from a dataset site. It is pulled directly from F1's
official timing feed through FastF1 by one script (`ml/src/fetch_season.py`), so every
column has a known origin and can be rebuilt on demand. For each completed race of the
season, the script:

1. **Selects the races to fetch** by comparing each round's race date with today's date, so
   races that have not happened yet are never requested.
2. **Downloads the race session**: every driver's every lap (timing, tyre, flag state), the
   official results, and the race's weather log (about one reading per minute, matched to each
   lap using the latest reading at or before that lap's start, so no future information is used). FastF1 caches each download on disk, so the first run takes several
   minutes and later runs are fast.
3. **Downloads the qualifying session** for the same weekend, giving each driver's
   qualifying position and best time, and, from the quickest qualifying laps' telemetry, the
   numbers describing the circuit's character.
4. **Estimates the circuit length** from qualifying car telemetry, since no public field provides it.
5. **Stacks all races into one table**, then **calculates** the derived columns: previous lap
   time, constructor points before each race, qualifying gap to pole, and each driver's and
   team's recent form.
6. **Estimates** the fuel load, then writes one CSV with columns ordered by origin, so every
   value is clearly reported, calculated or estimated.

Each season is built into its own file and validated on its own, and a combining script
stacks them into one training file, so re-running the current season as it grows never
touches earlier ones. The combined file was checked cell by cell against its sources and is an
exact copy (an early version was not: the default CSV reader nudged the last digit of floats, and
a text value in one column was read as missing). The build runs 14 automatic checks (16 on the combined file) (no duplicate laps, sector times
adding up to the lap time, estimated length times laps near the regulation race distance,
fuel starting at the assumed load, and others). Constructor points include sprint-race
points, which an earlier version left out; the corrected totals match the official
championship standings for every 2026 team, for 2025 after rounds 2 and 23 (both sprint
weekends), and for 2024 after five sprint weekends.

Practice sessions are downloaded separately, laps only, into their own table. Practice is
one row per driver per lap per session and the counts vary widely (one to 41 laps per driver
per session in 2026, with sprint weekends having a single session), so it does not fit the
race table's one-row-per-lap shape. Kept raw, it can later be summarised per driver per
weekend without downloading again. It now covers 2024 to 2026 (73,688 laps over 158 sessions). Checking it found
that in three weekends the fastest practice lap was 12-15% faster than the qualifying pole, because qualifying was
wet; this in turn showed that the circuit-character numbers, which are taken from qualifying, are distorted for those
three races (Section 5.13).

Quality checks run after each build: points before round 1 are zero for every team, the
three sector times sum to the lap time in all complete rows, estimated circuit length times
lap count lands on the regulation race distance for nearly every race, and the unusual null
counts are traced to a cause (drivers who set no qualifying time, drivers with no history yet).
A column-by-column description for collaborators who do not follow F1 is kept in
[`ml/DATA_DICTIONARY.md`](ml/DATA_DICTIONARY.md).

### 4.4 What was deliberately left out, for now

One data category is documented as available but not yet included: aggregated car
telemetry (average throttle, full-throttle share, DRS usage per lap). It is a realistic
addition once a baseline model exists, and is the heaviest job because it means slicing
per-sample telemetry for every driver and lap. (Weather, listed here earlier, has since been
added; see Section 4.2. Car telemetry is already downloaded, but only to describe the circuit: its length from the
race, and its character from qualifying.) Including it from the start would have made debugging the pipeline harder without
yet having a working baseline to compare against.

One category was planned and then dropped entirely: ERS/battery energy deployment
per lap. This does not exist in any public F1 data source for any season — F1 does
not release it — so it was removed from the feature plan rather than built around
a field that was never going to return data.

### 4.5 How data leakage is being handled (current plan)

The model's job is to predict each lap of a race that has already finished while that race is
replayed. The risk is that a model which has seen the race's real lap times would "predict"
them flawlessly (Section 5.1). The plan below is the current design. A first model has since been
trained and tested (Section 6). It follows rules 2 to 4 but not yet rule 1, and Section 7 lists what is
built.

**1. Walk-forward training, one model per race.** For any race being replayed, the model is
trained only on races that happened strictly before it: earlier rounds of the same season, and
earlier seasons if they are added. A separate model is built for each race in this way. The
training script will check automatically that the latest training race comes before the target
race, and fail the build otherwise, so the rule cannot be broken by accident.

**2. Only information available before the lap starts.** Inside the replayed race the model may
use that race's own earlier laps (the previous lap time, recent average pace, the gap to the car
ahead as the lap began), because a live predictor would know them. It may not use the lap being
predicted or anything after it. Measurements taken during or after a lap (its sector times, speed
readings, end-of-lap position) are usable only as the previous lap's values. Every column in the
dataset is marked with which case it falls into (`ml/DATA_DICTIONARY.md`).

**3. Information from before the race is legitimate, even in a replay.** Qualifying and
practice took place before the race, so using it for a race that is replayed later is
not leakage: it is what a predictor would have known on race day. These are inputs for the laps
being predicted. They are not training rows, because training needs real lap times, and those
exist only for earlier races, which carry their own qualifying information.

**4. Season-level features use earlier races only.** Constructor points and each driver's and
team's recent form are calculated from the races before the one in question (Section 5.1,
form one).

**Coping with a car that is much faster than last year.** A model that learned absolute lap
times from earlier seasons would be several seconds wrong for a car that is much quicker, or
for new regulations. The intended answer is to take the level of pace from the current race (the
recent laps and that weekend's qualifying) and to use history only to learn how lap time changes:
tyre wear, fuel burning off, traffic. The target would therefore be the change from the previous
lap and not the raw lap time. This is a hypothesis to test, not an established result.

**Serving the predictions.** All training happens offline, once. The predictions for each race
are saved as a file, and the replay loads the file for whichever race is being replayed, so
nothing is trained at replay time and the browser never runs a model. When a new race finishes,
one more model is trained and its file is added; nothing built earlier is retrained.

**How it will be judged.** Results will be walk-forward errors in seconds, reported per race and
separately for ordinary laps and disrupted ones (pit stops, safety cars). The benchmark is the
trivial predictor that repeats the previous lap: on laps whose previous lap was also clean it is
off by about 0.47 s on average (a descriptive figure from the whole dataset, not a model result).
As a leakage check, a deliberately leaky model trained including the target race should show a
suspiciously small error, and the honest walk-forward error should be clearly larger.

**Open decisions.**
- Whether the model may be told the current lap's flag state (a safety car can appear mid-lap)
  or must forecast without it.
- `DRI_TotalLaps` is now the first announced lap count (the schedule), so it no longer reveals that a
  race will be cut short (Section 5.12). It was the highest lap reached, which did.
- Earlier seasons give more races, repeated circuits and wet laps. 2024 and 2025 have both
  been added. The costs: about 170 MB of cache per race (the project was moved to a larger drive);
  weaker transfer from older seasons because of the 2026 regulation changes (untested); and
  season-specific constants. The fuel assumption is now year-aware (about 110 kg for 2024-25,
  70 kg for 2026). Team names still differ between seasons (Kick Sauber became Audi, Cadillac is
  new in 2026) and a mapping is planned but not built.
- Early-season races have little same-season history, so their models lean on older seasons and
  on the race's own laps.

## 5. Major issues encountered

This section is the honest account of what went wrong, because most of the actual
engineering effort in a project like this is in the problems that don't announce
themselves with an error message.

### 5.1 Data leakage — the central risk of the whole model

This is the most important issue in the project, and it shows up in three different
forms.

**Form one: leaking the future into a feature.** The plan was to use each
constructor's championship points as a stand-in for "how fast is this car this
season," since a different car is fastest every year. But if you use a team's
*final* season point total as a feature for every race in that season, an early
race's feature value includes points the team hadn't scored yet at the time that
race happened — information that couldn't possibly have been known. The fix: use
only the points a team had accumulated *before* each specific race, recomputed per
round, not the season-final number.

**Form two: training on the race you're about to predict.** If the model is
trained on a completed race and is then asked to predict that same race during
replay, it isn't predicting anything — it has already been shown the exact answer
during training. The predictions would come out looking flawless, but that would
be the model reciting results it memorized, not forecasting anything. This is the
issue flagged early on, and it shapes how the model must be evaluated going
forward: **training only ever uses races that happened before the race being
predicted**, enforced with a chronological split (train on rounds 1 through N−1,
only ever predict round N), never a race the model has already seen the result of.

**Form three: columns from the lap being predicted.** The dataset records each lap's
three sector times, speed-trap readings and end-of-lap position alongside the lap time
itself. The sector times add up to the lap time in every complete row, so a model given
the same lap's sectors does not predict the lap time, it re-adds it. The same applies,
less directly, to speed traps and end-of-lap position. Every input must therefore be
knowable before the lap starts: last lap's sectors are allowed, this lap's are not. This
was noticed after those columns were added, and the rule is recorded for the modelling
stage (each column is marked in the data dictionary).

The current plan for guarding against all three is set out in Section 4.5.

All three forms of this problem are the same underlying mistake wearing different
disguises: letting information from "the future," relative to the thing being
predicted, leak into training. It's also the easiest mistake to make by accident —
"just train on all available data" is the natural first instinct, and it's wrong
here.

### 5.2 No public energy/ERS data

Formula 1 does not publish ERS or battery deployment data in any public feed, for
any season — confirmed directly against FastF1's own maintainers, not assumed. An
early feature list included this; it was dropped, and aggregated throttle
application and DRS-open percentage were identified as the closest legitimate
substitutes, since they're the visible fingerprint of a driver pushing the car
hard, even without the underlying energy numbers.

### 5.3 A ready-made dataset turned out to be unreliable

Before building a custom fetch pipeline, an existing community-built dataset was
evaluated as a shortcut. It turned out to cover only a handful of drivers and had
empty fields for parts of the current season — a model trained on it would have
quietly learned a skewed picture of the field, with no error or warning to signal
that anything was wrong. Building the dataset directly from FastF1 instead avoids
this, and has a second benefit: it means the same code that builds the training
data can later be reused to compute features live, avoiding a subtler version of
the same problem — a model trained on one definition of a feature behaving
differently once fed a slightly different computation of "the same" feature at
prediction time.

### 5.4 Silent format traps in the source data

Two cases where a field's actual format didn't match what its name suggested:

- F1's `TrackStatus` field, which flags whether a safety car, yellow flag, or red
  flag affected a lap, is not a single code — it's several flag codes concatenated
  into one string when more than one occurred during a lap, in whatever order they
  happened (`"1254"`, or `"41"` with the digits in a different order on another
  lap). Treating it as a single number would silently misclassify laps that were
  genuinely affected by a safety car as ordinary green-flag laps.
- A driver who retired on lap 1 of a race shows up in the data with just one row,
  which looks identical to a data-fetching bug until it's cross-checked against the
  official results — in this case, it wasn't a bug, the driver really had retired
  that early, and nothing needed fixing.

### 5.5 A real crash, caused by incomplete error handling

Partway through fetching a full season, the pipeline crashed outright on the first
race that hadn't happened yet, losing an otherwise fully successful 15-race run in
the process, because the one line that actually reads a race's lap data sat just
outside the block of code responsible for catching errors. The fix had two parts:
catching that failure properly, and — more importantly — checking each race's date
before attempting to fetch it at all, so a future race is skipped outright instead
of relying on an error to catch it after the fact.

### 5.6 A known limitation: little wet running in the data

The model has little signal for how lap times behave in the rain. Across 2024-2026 there are
3,911 laps on intermediate tyres (5.5% of 71,674) and 37 on full wet tyres, concentrated in a
handful of races: the Canadian, British and Brazilian Grands Prix in 2024, the Australian, British
and Belgian in 2025, and the Bahrain and Canadian in 2026. That is some wet running, but little.
The weather data's rain flag is an unreliable guide: in 2026 it flags 151 laps, all in the Dutch
Grand Prix and all on dry tyres (about 0.7 s slower than dry laps, which looks like light
drizzle), while the Bahrain race, with 122 laps on intermediates, was never flagged. The flag
should be read together with the tyre compound, and that has not yet been checked against what
happened in each race. Earlier versions of this section said a season contains "a handful of wet
races", then "almost none"; each was corrected as more seasons were added. The honest summary is
that wet pace has a small amount of data behind it and any wet-weather result should be read with
that in mind.

### 5.7 Estimating what is not published

Several quantities that clearly matter for lap time are not available anywhere public.
**Fuel load** is the clearest case: a car is tens of kilograms heavier at the start of a race
than at the end, but fuel mass is a team-proprietary sensor channel. It is estimated as a
steady burn-down from a ~110 kg start (2024-25) or ~70 kg start (2026), using the race's lap count so that burn per lap
differs by circuit (about 1.6 kg per lap over Spa's 44 laps, 0.9 kg over Monaco's 78). The
2026 figure of 70 kg is the regulation's design target and not a confirmed cap, so the column is
named `DRI_EstimatedFuelKg` and should be read as a shape, not a weight. **Circuit length** is
estimated by integrating car speed over the quickest qualifying laps, which reads a few percent low against
official lengths. A third attempt, circuit corner counts, failed outright for 2026 because
the FastF1 circuit-information call returned nothing for Bahrain and lacked the lap's position data
for Monaco (position data does exist for nearly every race), and was dropped; the circuit's
character is instead summarised from qualifying telemetry (top speed, slowest corner, share of
the lap at full throttle, braking zones). With only 15 circuits, each seen once, a circuit's
name alone cannot teach a model which tracks resemble each other, so these numbers do that job. In each case
the approach is the same: label the estimate as an estimate, check it against something
independent (here, race distance), and do not present it as a measurement.

### 5.8 A refresh that looked successful and wasn't

Re-running the pipeline to add columns reported success, but the data file had not changed:
a spreadsheet application had the CSV open, so the final write was refused, and a chained
shell command hid the failed exit code. The file's timestamp also showed it had been
re-saved by the spreadsheet after the script wrote it, which can silently reformat numbers.
Two rules came out of it: the raw data folder holds script output only and is never opened
in a spreadsheet, and a refresh is only trusted after checking the real exit code and that
the new columns exist in the file.

### 5.9 A public API that locks during live sessions

While testing a possible source for gap-to-car-ahead data, every request to OpenF1, for every
season including 2024, returned an authentication error: the service restricts all access,
past sessions included, to keyed users while a live F1 session is running. The restriction is
temporary, but it has a direct consequence for the replay feature: the dashboard has no API
key (and one must not be placed in code that runs in the browser), so loading a replay during
a race weekend fails. This is a dependency risk that did not show up in earlier testing, which
happened to take place outside a live session. It has not been fixed; the options are a clearer
error message, or a small server-side proxy that holds a key. The same episode shaped the
dataset work: gap data was instead derived from FastF1 lap timestamps, which do not depend on
OpenF1.

A later test showed why the error is so unhelpful in a browser. The refusal is sent without the
header that lets a web page read a response from another site, so the browser reports only "failed to fetch" and
the page never sees the authentication error. The replay now says that a live session is the likely
cause. Everything else on the telemetry page, and the stored predictions, comes from static files and
keeps working (Section 3.6). Only the replay itself still depends on OpenF1.

### 5.10 Traffic data derived from lap timestamps, and the pairing artefact it exposed

The gap to the car ahead is calculated from the moments two cars cross the timing line. A first
version produced "gaps" of up to 19 minutes for a car running last: pairing cars by lap number
compares a lapped car with one that crossed that same lap number many minutes earlier. The fix
is to blank gaps longer than about one lap, since there is no car directly ahead on that lap.
After the fix, laps that begin within one second of another car are on average about 0.6 s
slower than that driver's median, and laps with more than 8 s of clear air about 0.25 s faster.
That is correlation, not proof: early laps are both bunched and carrying more fuel, so the
effect has not been separated from fuel and tyre wear.

### 5.11 A feature that was quietly wrong, and a rate limit

While preparing to add earlier seasons, a check of the constructor-points feature against the
official championship table showed it was undercounting: it summed only each race's result
points and left out sprint-race points. Seasons now have five or six sprint weekends, so the
error would have grown with every season added. The fix adds the Sprint results; the corrected
totals match the official standings for every 2026 team (1,695 points in total) and for 2025 after
a sprint weekend. The lesson is the same as before: a feature can look reasonable and be wrong,
and the only way to know is to compare it with an independent source.

Pulling the 2025 season also ran into the data library's own limit of 500 calls per hour. The
last round and a half failed to download, the script skipped them as designed and still reported
success, and a re-run after a short pause completed the season. The automatic checks passed on the
incomplete file because they cannot know how many rounds a season should have, so completeness
against the calendar remains a manual check.

The fetch scripts now exit with a distinct code (2) and list every problem whenever anything
could not be fetched, while still saving what they did get. The 2024 pull showed it working: the
limit was hit on the last round, the season was saved, and the script reported exactly one problem
(that round's circuit numbers). A later re-run, reusing the downloaded data, filled it.

### 5.12 Leaks found by review, and an all-clear that wasn't

A collaborator asked that the estimated columns use only information from before the lap. Checking each
claim found two real leaks and one false alarm. The circuit length was computed from the race's own fastest
laps, so it used laps that can come after the one being predicted; it now comes from qualifying. The total
number of laps was taken as the highest lap reached, which already knows if a race was cut short. In five of 64
races the announced total was revised during the race (for example Canada 2026, 70 to 68), so a model could
tell the race would end early. It is now the first announced lap count. After the fix, estimated length times laps
for those five races rose from 292-300 km to 301-306 km, the regulation race distance, which also explains why
Canada had looked short. The form columns were already correct: changing one driver's lap times from round 8
onwards left the form values of rounds 7 and 8 unchanged and moved only later rounds.

Two of the checks along the way were wrong, which is worth recording. The data library's own total-lap value matched
the laps reached in all 64 races, which looked like "no problem", but it takes the last value of the stream and so
follows the revision. And a first test of the form columns multiplied every lap time by the same factor, which cancels
out because form is relative to the field, so it could not have found a leak. A later step also failed silently on a
locked file while its error output was being filtered away, and it was noticed only because a result (no change in
track length) was impossible. The pattern holds across the project: a check is only as good as its ability to fail.

### 5.13 Wet qualifying distorts the circuit numbers

The circuit-character numbers (average speed, share of the lap at full throttle, braking zones) are taken from the quickest
qualifying laps, on the reasoning that qualifying happens before the race. That is true, but it assumes dry qualifying. In 3 of 64
races (Belgium 2024, Brazil 2024, Las Vegas 2025) qualifying was run on intermediates and wets, so the numbers describe wet laps:
average speed is 9 to 17% lower than the same circuit in other seasons, and the full-throttle share can be 25 points lower. A model
would see one circuit as two. The circuit length is unaffected. The problem surfaced indirectly, through a sanity check that
practice should be slower than pole and was not; the practice laps were fine, and the qualifying laps were the slow ones. The
affected numbers are now recomputed from the quickest dry-tyre laps of the same weekend's practice sessions (also before
the race, so no leakage); afterwards the average speed of those three races is within about 1% of the same circuit in other
seasons, where it had been 9 to 17% lower. A new automatic check warns when a circuit's average speed differs by more than
8% between seasons (the natural spread is about 2%, at most 4.6%); run on the data before the fix, it flags exactly the
three affected circuits.

### 5.14 Sample data that was not true, and result fields that mean less than they say

The dashboard was first built around sample data for "Monaco 2024", which showed Verstappen winning. Leclerc won that race.
Nothing flagged it, because sample data is never checked against anything. It was replaced with real results for every race,
generated from FastF1 and checked against the official results of several races.

Building those results exposed three fields that do not mean what they appear to mean. For a lapped car, FastF1's race time
is not the gap to the winner: Monaco 2024 showed Alonso 3.9 seconds behind, when he was two laps down. A disqualified car can
keep a numeric classified position, as Russell did at Spa 2024 (20th, disqualified), so the status has to be checked as well.
A car that retires after 90% of the distance is classified and keeps its position, but is printed as a retirement (DNF), for
example Verstappen at Silverstone 2026. Each case is now handled explicitly.

## 6. A first model: results, drawbacks and the plan to improve it

### 6.1 The model

The first model was built by a collaborator (the notebook `final.ipynb`). It uses gradient-boosted decision trees
(scikit-learn's `HistGradientBoostingRegressor`), but it does not predict a lap time from scratch. It starts from a
**baseline**, the average of the driver's last three normal laps in the same race, and predicts only a **correction** to it,
limited to plus or minus 5 seconds. That is the idea proposed in Section 4.5: the level of pace comes from the race being
predicted, and history is used to learn how pace changes from lap to lap (tyre wear, fuel burning off, traffic).

It was trained once, on the normal laps (green flag, no pit stop) of the 2024 and 2025 seasons. It has 15 inputs: the
baseline and the previous lap's difference from it, laps remaining, tyre age, a fresh-tyre flag, stint number, tyre compound,
estimated fuel, the gap to the car ahead as the lap starts, driver and team form, track and air temperature, rainfall, and the
previous lap's position. Each input was checked against the before-the-lap rule (Section 4.5, rule 2) and all of them pass:
anything measured during a lap is used only from the previous lap, and laps remaining comes from the announced lap count. In
total the notebook reads 23 of the dataset's 57 columns and ignores the other 34.

### 6.2 How it was tested

The model was scored on three 2026 races it had never seen: Japan (round 3), Britain at Silverstone (round 9) and Bahrain
(round 16). The notebook was not edited. A small runner executed its code unchanged and only swapped the race being replayed.
Every lap was predicted using only the laps before it, as it would be live.

Laps were scored in two groups. The first is green-flag racing laps, which are what the model was trained for. The second is
neutralised and pit laps, where a safety car, a virtual safety car (VSC) or a pit stop dominates the lap time. The yardstick is
the model's own starting point, the three-lap average. A model that cannot beat the number it starts from adds nothing.

### 6.3 Results

Mean absolute error (MAE) is the average size of a miss in seconds. RMSE punishes large misses more heavily. R² is the share of
the variation in lap times that the predictions explain (1 is perfect).

| Green-flag laps | Model MAE | Baseline MAE | Improvement |
|---|---|---|---|
| Japan 2026 | 0.377 s | 0.394 s | 4% |
| Silverstone 2026 | 0.415 s | 0.471 s | 12% |
| Bahrain 2026 | 1.075 s | 1.735 s | 38% |
| All three, 2,343 laps | 0.582 s (RMSE 1.451 s, R² 0.903) | 0.789 s (RMSE 2.079 s, R² 0.800) | 26% |

At Silverstone the prediction was within half a second on 76% of green-flag laps and within one second on 91%. Lap times there
are about 95 seconds, so the average miss is about 0.4% of a lap. These predictions are stored and shown lap by lap in the
replay (Section 3.6).

On its own, R² 0.903 looks impressive, but it says little. The baseline already reaches 0.81 to 0.83 in normal races, because
much of the variation in lap times is simply that some drivers are faster than others. The comparison with the baseline is the
informative number.

### 6.4 Drawbacks

These are the model's weaknesses, each measured. They are written down so that the next model can be judged against them.

1. **The gain in a normal race is small.** In the two dry, uneventful races the model beats a three-lap average by only 4% and
   12%, and it is closer than the average on just 52 to 56% of laps. The pooled 26% comes mostly from Bahrain, whose early laps
   were chaotic (a damp track and neutralisations).
2. **It cannot tell whether the next lap will be faster or slower.** Put as a yes/no question ("will this lap be slower than the
   last one?"), it is right 59% of the time, with an F1 score of 0.638. A rule that always answers "slower" scores 0.674, so the
   model has no skill at the direction of change. That direction is exactly what tyre wear and fuel burn should explain. The
   model's value is in estimating the level of pace, not in how pace evolves.
3. **It predicts laps it was never trained on.** On safety-car, VSC and pit laps its errors are 8 to 34 seconds. Counting those
   laps, R² falls to about zero (0.013), no better than the baseline. The model has no way to say "this lap is not normal".
4. **It is not yet walk-forward.** It is trained once on 2024 and 2025, so the earlier 2026 races are never used, even though 2026
   introduced new cars and a lower fuel load. This is rule 1 of Section 4.5, which is not met yet.
5. **It does not get better as a race goes on.** At Silverstone the error rises from 0.345 s (laps 2 to 18) to 0.427 s (laps 19
   to 37) to 0.547 s (lap 38 on). In the last third the gain over the baseline is almost gone (0.547 against 0.557 s). It learns
   nothing during the race beyond updating its three-lap average.
6. **It ignores the columns built for its hardest problem.** Qualifying pace, the circuit-character numbers and practice laps
   are among the 34 unused columns. They were added to tell the model how fast a car is this weekend (Section 4.5) before the
   race has produced any laps.
7. **A few misses are large.** RMSE is about twice the MAE. At Silverstone 2.4% of green-flag laps miss by more than 2 seconds,
   the worst by 8.5 s, and 5 of the 6 largest misses are one driver's (Albon). The cause has not been investigated.
8. **There is no prediction until a driver has run a normal lap.** At Silverstone 45 of 1,091 driver-laps have no prediction,
   and at Bahrain 52 of 1,123 (4.6%), lap 1 included.
9. **Wet laps are weak.** On intermediate and wet tyres at Bahrain it was slightly worse than the baseline (1.84 against
   1.72 s, only 38 laps), consistent with how little wet running the data holds (Section 5.6).
10. **The evidence is thin, and the model is not yet reproducible from the repository.** Only 3 of the 16 completed 2026 races have
    been scored, so these figures are indicative. The notebook also sat in a folder that version control ignores, so the
    repository could not rebuild it.

### 6.5 How the model will be improved

The plan is to improve the model where the drawbacks above say it is weak, and to be able to show each improvement. These are
the commitments:

1. **One test for every model.** Every model is scored by the same runner on the same laps and reports the same figures: error
   per race, the share of laps within 0.5 s and 1 s, the yes/no direction score, and green-flag and neutralised laps separately.
   Two benchmarks are always reported alongside: repeating the previous lap, and the three-lap average. A new model counts as
   better only if it beats the baseline on green-flag laps in most of the races scored, not just in a pooled number that one
   unusual race can dominate.
2. **Score every completed race.** All 16 completed 2026 races will be scored, not 3, and the per-race table will be published,
   including the races where the model loses.
3. **Train walk-forward.** Build one model per race, trained only on races before it, so that earlier 2026 rounds inform later
   ones. The training script checks automatically that no training race comes after the target race (Section 4.5, rule 1).
4. **Treat neutralised laps explicitly.** Safety-car, VSC and pit laps are either withheld or given their own model; the main
   model never silently predicts them. Until then the replay labels these laps instead of colouring their error as a miss.
5. **Test the unused columns one group at a time.** Qualifying gap, circuit character and practice pace are added one group at
   a time and kept only if they lower the walk-forward error. Feature-importance measures are reported for what stays.
6. **Test a baseline that restarts after a pit stop.** The three-lap average can mix laps on worn tyres with the first laps on
   new ones. Whether that hurts the start of each stint is measured first, and the baseline is changed only if it does.
7. **Show uncertainty.** Predict a likely range, not only a single number, so the replay can show how sure the model is. The
   largest misses (such as Albon's at Silverstone) are investigated individually.
8. **Wet running.** Gather more wet laps from additional seasons, or mark wet predictions as low-confidence.
9. **Make it reproducible.** Move the notebook into the tracked repository, turn it into a script, record the library
   versions, and produce the stored predictions with the same export step the replay already uses.
10. **The collaborator's next version is scored first.** It goes through the same test before anything else is tried, and the
    comparison is reported whichever model wins.

## 7. Current status

| Component | Status |
|---|---|
| Replay engine | Working, tested against live Monaco 2024 data, embedded in the dashboard. Any 2024-2026 race can be selected; loading other races by date has not yet been tested live, because OpenF1 was locked at the time |
| Telemetry page | Real results, fastest lap, speed trap and winner's pace for all 64 races, from static files built offline |
| Lap-time dataset | Built and validated: 2024-2026, 64 races, 71,674 rows, 57 columns in six origin-ordered groups; per-season files plus a combined training file; automatic checks, all passing; the combined file is verified to be an exact copy of the season files |
| Data dictionary | Written, with a known-before-the-lap marking for every column |
| Leakage strategy | Rules 2-4 of Section 4.5 are met by the first model; rule 1 (walk-forward per-race training) is not yet implemented |
| Feature engineering | First pass: 15 inputs, using 23 of the 57 columns (Section 6.1) |
| Model selection / training | First model trained and scored on 3 unseen 2026 races (Section 6.3); its drawbacks and the improvement plan are in Sections 6.4-6.5 |
| Live prediction integration | Stored predictions are shown on the replay's driver cards for Silverstone 2026; not yet watched end to end, because OpenF1 was locked at the time |

## 8. Future work

- Carry out the model commitments of Section 6.5: one shared test, every completed race scored,
  walk-forward training, explicit handling of neutralised laps, and the unused columns tested one
  group at a time.
- Consider using the GPS position data FastF1 holds for nearly every race to measure the gap to
  the car ahead in true metres and the circuit length directly, in place of the current estimates.
- Finish the open data item: the team-name mapping across seasons.
- Store predictions for every scored race, not only Silverstone 2026, so the replay can show them
  for any race.
- Add a small server-side proxy that holds an OpenF1 key, so replays also load during live sessions.
- Enforce the before-the-lap rule: replace same-lap sectors, speed traps and end-of-lap
  position with their previous-lap (lagged) versions, and decide whether the model may be
  told the current lap's flag state or must forecast without it.
- Check which columns actually matter, using correlation heatmaps and feature-importance
  measures, before deciding what to keep.
- Verify the open data questions against official results: why a few drivers have no qualifying
  time in some rounds. (Canada's 68-lap total is explained: the announced lap count was cut from
  70 to 68 during that race, one of five races whose total was revised.)
- Add aggregated telemetry features once the walk-forward model is working, to measure
  whether they actually improve it rather than assuming they will.
- Revisit older seasons specifically to cover wet-weather laps.

## 9. Conclusion

The more interesting half of this project so far has not been the parts that
worked on the first try — it's been the handful of places where the data looked
fine and wasn't: a race's official start time that wasn't the real start, a flag
field that silently holds more than one value, and a modeling shortcut that would
have made a prediction model look perfect by letting it see results it was never
supposed to know about. The first model added one more example: an R² of 0.90 that sounded
excellent, until a three-lap average turned out to score 0.81 to 0.83 on its own. Measured against
that, the model is 4 to 12% better in a normal race. That is a real but modest result, and
Section 6 says where the rest has to come from. Documenting those as they were found, rather than quietly
fixing them and moving on, is what [`ml/RESEARCH_LOG.md`](ml/RESEARCH_LOG.md) is
for, and this paper is the summary of where that log has led so far.

## References

- OpenF1 API documentation — <https://openf1.org>
- FastF1 documentation — <https://docs.fastf1.dev>
- [`ml/RESEARCH_LOG.md`](ml/RESEARCH_LOG.md) — dated log of every issue and decision referenced above, in full detail
