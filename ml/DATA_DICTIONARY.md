# Data dictionary: the lap tables

Four files share the same 57 columns: `laps_2024_raw.csv`, `laps_2025_raw.csv`, `laps_2026_raw.csv`
(one per season, the sources of truth) and `laps_all_raw.csv` (the three stacked by
`combine_seasons.py`, 71,674 laps over 64 races, used for training; filter it by `Year` for a
subset). Never edit the combined file by hand.

**Columns starting with `DRI_` are derived:** values we calculated or estimated ourselves, not values F1
reported. They form one block at the end (columns 39-57). Everything else is as F1 reported it, apart from unit
conversions (for example lap times from a time to seconds). "Estimated" inside a name marks an approximation,
as against exact arithmetic. In the code the columns keep their plain names; the prefix is added when the
files are written.

**Completeness:** all three seasons are complete (an earlier gap in 2024 round 24's circuit
columns was filled by a re-run). The combined file holds exactly the same cells as the season
files, sorted by season, round, driver number (numeric) and lap.

One row = one driver's one lap in one race. 57 columns, ordered in blocks so you can see at a
glance where a value came from and whether it may be used as a model input.

For a spreadsheet view, open `ml/data/view/laps_2026.csv` (an identical copy). Never open
`data/raw/` in Excel: it locks the file and blocks the pipeline's next write.

Written for someone who doesn't follow F1, so terms are explained as they come up.

## Column map (left to right in the file)

| # | Block | Columns | Origin | Usable as input for the same lap? |
|---|---|---|---|---|
| 1-8 | Identity | `Year` ... `TeamName` | reported | labels, not features |
| 9 | Target | `LapTimeSeconds` | reported | **this is the answer** |
| 10-12 | Before the race | `GridPosition`, `Quali*` | reported | Yes |
| 13-19 | Conditions (weather) | `AirTempC` ... `RainfallFlag` | reported | Yes |
| 20-24 | Lap state | `LapNumber`, `Stint`, `Compound`, `TyreLife`, `FreshTyre` | reported | Yes |
| 25-35 | Same-lap measurements | `Sector*`, `Speed*`, `Position`, `TrackStatus`, `Pit*Time` | reported | **No, lagged only** |
| 36-38 | Filter flags | `Deleted`, `DeletedReason`, `IsAccurate` | reported | **No, filtering only** |
| 39-46 | Calculated: race and weekend | `DRI_TotalLaps`, points, qualifying gaps, form | calculated | Yes |
| 47-49 | Calculated: lap | `DRI_PrevLapTimeSeconds`, `DRI_GapToCarAheadAtLapStartSeconds`, `DRI_RaceFractionCompleted` | calculated | Yes |
| 50-55 | Estimated: circuit | `DRI_EstimatedTrackLengthM`, `DRI_EstimatedCircuit*` | estimated | Yes |
| 56-57 | Estimated: lap | `DRI_EstimatedFuelKg`, `DRI_EstimatedGapToCarAheadAtLapStartM` | estimated | Yes |

- **Reported** = straight from F1's timing data. **Calculated** = exact arithmetic on reported
  data. **Estimated** = an approximation, because the real value is not published.
- Within each origin the order runs broad to narrow: whole circuit, then the driver's weekend,
  then the single lap.
- **Why the same-lap block matters:** it is one contiguous block, columns 25-35, because every
  one of those values is only known during or after the lap. The three sectors sum to the lap
  time, so using them for the same lap hands the model the answer (see `RESEARCH_LOG.md`,
  leakage risk #3). Use their *previous-lap* versions instead.

**"Known before the lap?"** in the tables below uses the same idea: could a forecaster know this
value *before the lap is driven*?

- **Yes**: known in advance.
- **Lagged**: only usable from the *previous* lap.
- **No**: measured during or after the lap, or used only for filtering bad rows.

## F1 terms in one place

- **Stint**: the stretch between pit stops, on one set of tyres.
- **Compound**: tyre type. SOFT is fastest but wears quickly, HARD is slowest but lasts, MEDIUM is in between. INTERMEDIATE and WET are for rain.
- **Pit in / pit out**: entering and leaving the pit lane for a stop. Those laps are slow and unrepresentative.
- **Safety car / VSC**: the field is slowed behind a safety car (or virtual safety car) after an incident, so laps are much slower.
- **Grid position**: where a driver starts the race, set by qualifying (a Saturday time-trial session).
- **Constructor**: an F1 team. The "constructors' championship" is the team points table.

## 1. Identity (columns 1-8)

| Column | Meaning | Known before the lap? |
|---|---|---|
| `Year`, `Round` | Season and race number (1 = first race) | Yes |
| `EventName` | Race name, e.g. Monaco Grand Prix | Yes |
| `Country`, `Location` | Where the race is held | Yes |
| `Driver` | 3-letter code, e.g. NOR | Yes |
| `DriverNumber` | The car number | Yes |
| `TeamName` | The team. **Not harmonised across seasons**: RB (2024) is Racing Bulls (2025-26), Kick Sauber (2024-25) became Audi (2026), and Cadillac is new in 2026. A mapping is planned, not built | Yes |

## 2. Target (column 9)

| Column | Meaning | Known before the lap? |
|---|---|---|
| `LapTimeSeconds` | **The value we are trying to predict**: how long the lap took | n/a (it is the answer) |

## 3. Reported before the race (columns 10-12)

| Column | Meaning | Known before the lap? |
|---|---|---|
| `GridPosition` | Official starting position | Yes |
| `QualiPosition` | Finishing position in qualifying | Yes |
| `QualiBestSeconds` | Driver's best qualifying lap. A driver knocked out early only has an earlier, slower-track time | Yes |

## 4. Reported conditions: track-side weather (columns 13-19)

F1 logs weather about once a minute. Each lap takes the **latest reading at or before the
lap started**, so these are values a forecaster could know in advance.

| Column | Meaning | Known before the lap? |
|---|---|---|
| `AirTempC` | Air temperature, degrees Celsius | Yes |
| `TrackTempC` | Track surface temperature, degrees Celsius. Strongly affects tyre grip | Yes |
| `HumidityPct` | Relative humidity, percent | Yes |
| `PressureMbar` | Air pressure, millibar | Yes |
| `WindSpeedMS` | Wind speed, metres per second | Yes |
| `WindDirectionDeg` | Wind direction, degrees (0-360). Direction relative to the track is not computed | Yes |
| `RainfallFlag` | 1 if rain was reported, else 0. **Unreliable as a wet indicator**: in 2026 it flags 151 laps, all in the Dutch GP on dry tyres (drizzle), while the Bahrain 2026 race, with 122 laps on intermediates, was never flagged. Read it together with `Compound` (not yet checked against what happened in each race) | Yes |

Across 2024-2026 there are 3,911 intermediate-tyre laps (about 5.5%) and 37 on full wets, in a handful
of races: 2024 Canada, Britain and Brazil; 2025 Australia, Britain and Belgium; 2026 Bahrain and Canada.
That is some wet running, but little, concentrated in a few races.

## 5. Reported lap state (columns 20-24)

| Column | Meaning | Known before the lap? |
|---|---|---|
| `LapNumber` | Which lap of the race | Yes |
| `Stint` | Which stint (1 = before the first pit stop) | Yes |
| `Compound` | Tyre type on this lap | Yes |
| `TyreLife` | Laps already driven on this set of tyres | Yes |
| `FreshTyre` | Whether the tyres were brand new when fitted | Yes |

## 6. Reported same-lap measurements: lagged use only (columns 25-35)

| Column | Meaning | Known before the lap? |
|---|---|---|
| `Sector1/2/3Seconds` | The lap split in three parts; the three sum to `LapTimeSeconds` | **No** (lagged only) |
| `SpeedI1`, `SpeedI2` | Speed in km/h at two measuring points part-way round the lap | **No** (lagged only) |
| `SpeedFL` | Speed at the finish line | **No** (lagged only) |
| `SpeedST` | Speed at the "speed trap" on the longest straight | **No** (lagged only) |
| `Position` | Running position at the end of the lap | **No** (lagged only) |
| `TrackStatus` | Flag state during the lap. A string of digits: 1 = green, 2 = yellow, 4 = safety car, 5 = red flag, 6 = virtual safety car, 7 = VSC ending. Several digits mean several things happened. Never read it as one number | **No** (a safety car can appear mid-lap) |
| `PitInTime`, `PitOutTime` | Filled only on the lap a car enters or leaves the pits | In: **No**, Out: Yes (known as the lap starts) |

## 7. Reported filter flags: not model inputs (columns 36-38)

| Column | Meaning | Known before the lap? |
|---|---|---|
| `Deleted`, `DeletedReason` | Set when officials struck the lap time (e.g. track limits) | **No** (filtering only) |
| `IsAccurate` | FastF1's own trust flag for the timing. Unreliable: for some drivers it marks every lap false | **No** (filtering only) |

## 8. Calculated: race and weekend level (columns 39-46)

| Column | Meaning | Known before the lap? |
|---|---|---|
| `DRI_TotalLaps` | The race distance in laps **as first announced, before the race** (the schedule). Where the total was cut during the race (Brazil 2024, Australia and Austria 2025, Canada and Bahrain 2026) this is the original number, not the shortened one, so it does not reveal that the race will end early | Yes |
| `DRI_ConstructorPointsToDate` | The team's championship points from races *before* this one, **including sprint-race points** (an earlier version left them out and understated sprint weekends; fixed and checked against the official standings) | Yes |
| `DRI_QualiGapToPoleSeconds` | Qualifying time minus the fastest qualifier's, in seconds | Yes |
| `DRI_QualiGapToPolePct` | The same gap as a percentage of the pole time, comparable across circuits | Yes |
| `DRI_DriverFormPacePct` | Driver's average pace over their previous (up to 3) races, as % off the field's median clean lap. **Negative = faster than the field** | Yes |
| `DRI_DriverFormRounds` | How many past races that average uses (0 in round 1) | Yes |
| `DRI_TeamFormPacePct` | Same, for the team | Yes |
| `DRI_TeamFormRounds` | How many past races the team average uses | Yes |

Form columns are **blank in round 1** by design: there is no history yet. A "clean lap" for
form is a timed green-flag lap, not a pit lap, not lap 1, not deleted. Median pace mixes in
strategy and traffic, so it is a rough signal.

## 9. Calculated: lap level (columns 47-49)

| Column | Meaning | Known before the lap? |
|---|---|---|
| `DRI_PrevLapTimeSeconds` | The same driver's previous lap time. Blank on lap 1 | Yes |
| `DRI_GapToCarAheadAtLapStartSeconds` | Seconds between this car and the car directly ahead of it, **as it stood when the lap began** (the end of the previous lap). Small means close behind another car, which hurts lap time ("dirty air"). Blank for race leaders, lap 1, red-flag laps, and gaps over 1.5 median laps (no car directly ahead on the same lap). Median ~3 s; about 22% of laps start within 1 s | Yes |
| `DRI_RaceFractionCompleted` | Share of the race already run when the lap starts: 0 on lap 1, rising towards 1. Means the same thing in every season, unlike kilograms of fuel, so it is the safer feature across seasons | Yes |

## 10. Estimated: circuit level (columns 50-55)

| Column | Meaning | Known before the lap? |
|---|---|---|
| `DRI_EstimatedTrackLengthM` | Circuit lap length in metres, from integrating speed over the quickest **qualifying** laps (before the race). Reads a few percent low (Monaco was 3255 m against 3337 m official). Good for comparing circuits, not for exact distance | Yes |
| `DRI_EstimatedCircuitTopSpeedKph` | The circuit's top speed on a flat-out qualifying lap (median of the 5 quickest laps). Monza ~342, Monaco ~287 | Yes |
| `DRI_EstimatedCircuitMinSpeedKph` | The slowest point of that lap, i.e. the tightest corner. Monaco ~45 (the hairpin), Barcelona ~102 | Yes |
| `DRI_EstimatedCircuitAvgSpeedKph` | Average speed over that lap. Monza ~253, Monaco ~163 | Yes |
| `DRI_EstimatedCircuitFullThrottlePct` | Share of that lap with the throttle at or above 98%. Monza ~73%, Monaco ~38%. Tells the model how "power-hungry" the circuit is | Yes |
| `DRI_EstimatedCircuitBrakingZones` | Number of separate braking events on that lap. Roughly the count of heavy corners. Counted from a flickery brake signal, so it is approximate (Monaco ~13, Monza ~7, Baku ~12) | Yes |

These describe the *circuit*, not the lap, so they repeat the same value on every row of a race.
The length and the five `DRI_EstimatedCircuit...` numbers all come from **qualifying** telemetry, so they are
known before the race and say nothing about race lap times. Exception: when qualifying was wet (Belgium 2024,
Brazil 2024, Las Vegas 2025) they come from the quickest dry-tyre laps of that weekend's practice sessions
instead (Brazil 2024 had only FP1, a sprint weekend). Braking-zone counts stay approximate (Spa 2024 reads 8
against 6 in other seasons). With only 15 circuits, each seen once, they are what
lets a model compare circuits instead of memorising names. The circuit's name is already in
`EventName`, `Country` and `Location`.

## 11. Estimated: lap level (columns 56-57)

| Column | Meaning | Known before the lap? |
|---|---|---|
| `DRI_EstimatedFuelKg` | Fuel left at the *start* of the lap, assuming a load that burns down steadily: about 110 kg in 2024-25 (the long-standing limit), spread over `DRI_TotalLaps` (the announced race distance) and about 70 kg in 2026 (a regulation design target, not a confirmed cap). Real fuel mass is not in any public source, so treat this as a **shape**, not an exact weight. A season missing from the build's table raises an error instead of using another season's number | Yes |
| `DRI_EstimatedGapToCarAheadAtLapStartM` | The same gap in metres: seconds x the finish-line speed. An estimate, because it assumes the car ahead was going the same speed. Real metres would need the GPS positions FastF1 holds for nearly every race (not yet used). Median ~218 m | Yes |

## Separate files: `practice_2024_raw.csv`, `practice_2025_raw.csv`, `practice_2026_raw.csv` (practice laps)

Practice is kept **out of the race table on purpose**. A race table has one row per driver per lap
with similar counts for everyone. Practice is one row per driver per lap per *session*, and counts
vary hugely: a driver does between 1 and 41 laps in a session (median 23-24), and sprint weekends
have a single practice session instead of three (2024: rounds 5, 6, 11, 19, 21, 23; 2025: rounds 2, 6, 13,
19, 21, 23; 2026: rounds 2, 4, 5, 9, 12). It is stored raw and long so any summary can be built later
without re-downloading. All three files have the same 28 columns. View copies are in `ml/data/view/`.

| File | Laps | Sessions | Rounds |
|---|---|---|---|
| `practice_2024_raw.csv` | 26,076 | 60 | 24 |
| `practice_2025_raw.csv` | 27,986 | 60 | 24 |
| `practice_2026_raw.csv` | 19,626 | 38 | 16 (to date) |

Join key to the race table: `Year`, `Round`, `DriverNumber`, after reducing practice to one row
per driver per weekend (not built yet). Practice includes 34-36 drivers per season against 21-25 in races,
because reserve drivers take part in FP1, so a join drops them.

| Columns | Meaning |
|---|---|
| `Year`, `Round`, `EventName`, `Country`, `Location` | Which race weekend |
| `Session` | `FP1`, `FP2` or `FP3` |
| `Driver`, `DriverNumber`, `TeamName` | Who |
| `LapNumber`, `LapTimeSeconds` | The lap and its time. Blank for laps with no time (about 22%) |
| `Sector1/2/3Seconds`, `SpeedI1`, `SpeedI2`, `SpeedFL`, `SpeedST` | Splits and speed readings, as in the race table |
| `Stint`, `Compound`, `TyreLife`, `FreshTyre` | Tyre information. `TyreLife` and `FreshTyre` matter for telling a run on new tyres from one on used |
| `TrackStatus`, `PitInTime`, `PitOutTime` | Flag state and pit markers. About 35% of laps are in- or out-laps |
| `Deleted`, `DeletedReason`, `IsAccurate` | Filter flags, as in the race table |

**Known before the race?** Yes: every practice lap happens before the race, so it is legitimate input
for predicting that race's laps, even when a concluded race is replayed later.

**Read with care.** Practice is not race pace. Teams run different programmes (installation laps,
qualifying simulations, long runs), fuel loads and engine modes are unknown, and only about 61% of
laps are usable (timed, not an in/out lap, not deleted). The fastest practice lap is 0.5-2.5% slower
than the qualifying pole in every 2026 round with both, which is the expected direction (2024 median
+1.2%, 2025 median +0.9%). Three weekends are the exception, where practice is 12-15% FASTER than pole:
Belgium 2024, Brazil 2024 and Las Vegas 2025. The practice laps are real; qualifying was wet (the five
quickest qualifying laps were all on intermediates), so the pole lap is slow. Whether practice adds anything
beyond qualifying is untested; decide with a with-and-without comparison.

**Wet qualifying and the circuit numbers (fixed).** The `DRI_EstimatedCircuit...` numbers come from the quickest
qualifying laps, so in the three weekends where qualifying was wet (Belgium 2024, Brazil 2024, Las Vegas 2025)
they described wet laps (average speed 9-17% lower than the same circuit in other seasons). For those three
weekends they are now taken from the quickest dry-tyre laps of that weekend's practice sessions, which also happen
before the race. Afterwards their average speed is within about 1% of the same circuit in other seasons.

## Not available anywhere public (so not in the dataset)

ERS/battery state, true fuel mass, tyre temperatures and pressures, engine modes, car setup,
circuit corner counts (FastF1's circuit-info call failed on the 2026 races tried: no layout came
back for Bahrain, and the lap's position data was missing for Monaco), and exact distance in
metres to the car ahead (FastF1 does hold position data for nearly every race, but it has not
been used yet).
