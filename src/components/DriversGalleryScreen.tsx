import React, { useEffect, useMemo, useState } from 'react';
import { F1_STANDINGS_SEASONS, loadF1Standings } from '../data/f1Data';
import { MOTOGP_RIDER_SEASONS, loadMotoGPRiders } from '../data/motogpData';
import type { MotoGPRider, MotoGPRiderLineup } from '../data/motogpData';
import { largeHeadshot } from '../replay/raceSummary';
import { ChampionshipStandings, Driver, StandingsDriver, ThemeMode } from '../types';

export type GallerySport = 'f1' | 'motogp';

interface DriversGalleryScreenProps {
  onSelectDriver: (driver: Driver) => void;
  theme?: ThemeMode;
  /** Which grid to show. Defaults to F1. */
  sport?: GallerySport;
}

/** A gallery card: the app's Driver shape (which the pop-up uses), plus the text colour for its badge. */
type Card = Driver & { teamTextColor?: string | null; role?: string };

function flagImage(iso2: string | null): string {
  return iso2 && /^[A-Za-z]{2}$/.test(iso2) ? `https://flagcdn.com/w40/${iso2.toLowerCase()}.png` : '';
}

function riderAge(r: MotoGPRider): string {
  if (!r.birthDate) return '';
  const born = new Date(`${r.birthDate}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `born ${born}${r.birthCity ? ` in ${r.birthCity}` : ''}`;
}

function riderCard(r: MotoGPRider, year: number): Card {
  const pos = r.championshipPos;
  const standing =
    pos !== null
      ? `P${pos} in the ${year} championship with ${r.points} points, ${r.wins} ${r.wins === 1 ? 'win' : 'wins'} and ${r.podiums} ${
          r.podiums === 1 ? 'podium' : 'podiums'
        }`
      : `no championship points in ${year}`;
  const role = r.role === 'Official' ? '' : ` (${r.role.toLowerCase()})`;
  return {
    id: `${r.lastName}-${r.number}`,
    rank: pos ?? 0,
    number: r.number,
    carNumber: r.number,
    firstName: r.firstName,
    lastName: r.lastName,
    code: '',
    team: r.team,
    teamColor: r.teamColor ?? '#888899',
    teamTextColor: r.teamTextColor,
    points: r.points,
    wins: r.wins,
    podiums: r.podiums,
    country: r.countryName ?? '',
    flagUrl: flagImage(r.country),
    portraitUrl: r.photo ?? '',
    role: r.role,
    bio: [
      `${r.firstName} ${r.lastName}${r.age ? `, ${r.age},` : ''} rides #${r.number} for ${r.team}${
        r.manufacturer ? ` (${r.manufacturer})` : ''
      }${role}: ${standing}.`,
      riderAge(r) ? `${riderAge(r).charAt(0).toUpperCase()}${riderAge(r).slice(1)}.` : '',
      r.since ? `In Grand Prix racing since ${r.since}.` : '',
    ]
      .filter(Boolean)
      .join(' '),
  };
}

function f1Card(d: StandingsDriver, year: number, afterEvent: string): Card {
  return {
    id: d.code ?? String(d.number),
    rank: d.pos,
    number: d.number,
    carNumber: d.number,
    firstName: d.firstName,
    lastName: d.lastName,
    code: d.code ?? '',
    team: d.team,
    teamColor: d.teamColor ?? '#888899',
    teamTextColor: '#FFFFFF',
    points: d.points,
    wins: d.wins,
    podiums: d.podiums,
    country: '',
    flagUrl: '',
    portraitUrl: largeHeadshot(d.headshot ?? null) ?? '',
    bio: `${d.name} (${d.code}) drives car #${d.number} for ${d.team}: P${d.pos} in the ${year} championship with ${
      d.points
    } points, ${d.wins} ${d.wins === 1 ? 'win' : 'wins'} and ${d.podiums} ${d.podiums === 1 ? 'podium' : 'podiums'} from ${
      d.races ?? '?'
    } ${d.races === 1 ? 'race' : 'races'}, after the ${afterEvent}.`,
  };
}

export const DriversGalleryScreen: React.FC<DriversGalleryScreenProps> = ({
  onSelectDriver,
  theme = 'dark',
  sport = 'f1',
}) => {
  const [teamFilter, setTeamFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const seasons = sport === 'motogp' ? MOTOGP_RIDER_SEASONS : F1_STANDINGS_SEASONS;
  const [season, setSeason] = useState<number>(seasons[0]);
  const [lineup, setLineup] = useState<MotoGPRiderLineup | null>(null);
  const [f1Standings, setF1Standings] = useState<ChampionshipStandings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isDark = theme === 'dark';
  const isMotoGP = sport === 'motogp';

  // A different sport starts again from its latest season.
  useEffect(() => {
    setSeason((sport === 'motogp' ? MOTOGP_RIDER_SEASONS : F1_STANDINGS_SEASONS)[0]);
    setTeamFilter('ALL');
  }, [sport]);

  // MotoGP: the rider line-up file. F1: the standings file, which lists every driver of the season.
  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    const loading = isMotoGP
      ? loadMotoGPRiders(season).then((l) => !cancelled && setLineup(l))
      : loadF1Standings(season).then((s) => !cancelled && setF1Standings(s));
    loading.catch((err: Error) => {
      if (!cancelled) setLoadError(err.message);
    });
    return () => {
      cancelled = true;
    };
  }, [isMotoGP, season]);

  // The grid and the rest, as cards. MotoGP: full-season riders vs substitutes and wildcards.
  // F1: the drivers of the latest race (the current line-up) vs drivers who also raced this season.
  const { grid, others } = useMemo(() => {
    if (isMotoGP) {
      if (!lineup || lineup.year !== season) return { grid: [] as Card[], others: [] as Card[] };
      return {
        grid: lineup.grid.map((r) => riderCard(r, lineup.year)),
        others: lineup.others.map((r) => riderCard(r, lineup.year)),
      };
    }
    if (!f1Standings || f1Standings.year !== season) return { grid: [] as Card[], others: [] as Card[] };
    const card = (d: StandingsDriver) => f1Card(d, f1Standings.year, f1Standings.afterEvent);
    return {
      grid: f1Standings.drivers.filter((d) => d.inLatestRace !== false).map(card),
      others: f1Standings.drivers.filter((d) => d.inLatestRace === false).map(card),
    };
  }, [isMotoGP, lineup, f1Standings, season]);

  // Team filter buttons come from the data, in championship order of their best driver.
  const teams = ['ALL', ...Array.from(new Set(grid.map((d) => d.team)))];

  const matches = (driver: Card) => {
    const q = searchQuery.toLowerCase();
    const matchesTeam = teamFilter === 'ALL' || driver.team.toLowerCase().includes(teamFilter.toLowerCase());
    const matchesSearch =
      driver.firstName.toLowerCase().includes(q) ||
      driver.lastName.toLowerCase().includes(q) ||
      driver.code.toLowerCase().includes(q) ||
      driver.team.toLowerCase().includes(q) ||
      String(driver.number) === q.replace('#', '');
    return matchesTeam && matchesSearch;
  };
  const filteredDrivers = grid.filter(matches);
  const filteredOthers = others.filter(matches);

  const renderCard = (driver: Card) => {
    const isP1 = driver.rank === 1;
    return (
      <div
        key={driver.id}
        onClick={() => onSelectDriver(driver)}
        className={`border rounded overflow-hidden cursor-pointer group transition-all duration-300 transform hover:-translate-y-1 relative flex flex-col justify-between shadow-sm ${
          isDark
            ? 'bg-[#121217] border-[#22222A] hover:border-[#E10600]'
            : 'bg-[#FFFFFF] border-[#E2E2E8] hover:border-[#E10600]'
        }`}
      >
        {/* Top Accent Line */}
        <div className="h-1 w-full" style={{ backgroundColor: driver.teamColor }}></div>

        {/* Card Header */}
        <div className="p-4 flex justify-between items-start">
          <div className="flex items-center gap-2">
            <span
              className={`font-f1-title font-black px-2 py-0.5 rounded-[2px] text-xs ${
                isP1
                  ? 'bg-[#E10600] text-white shadow-[0_0_8px_rgba(225,6,0,0.5)]'
                  : isDark
                  ? 'bg-[#1E1E28] text-white'
                  : 'bg-[#EAEAEF] text-black'
              }`}
            >
              {driver.rank ? `POS ${driver.rank}` : driver.role && driver.role !== 'Official' ? driver.role.toUpperCase() : 'POS —'}
            </span>
            {isMotoGP ? (
              <span
                className="font-mono-f1 font-black text-xs px-1.5 py-0.5 rounded-[2px]"
                style={{ backgroundColor: driver.teamColor, color: driver.teamTextColor ?? '#FFFFFF' }}
              >
                #{driver.number}
              </span>
            ) : (
              <span className="font-mono-f1 font-bold text-xs text-[#888899]">#{driver.number}</span>
            )}
          </div>

          {driver.flagUrl && (
            <div className="w-5 h-3.5 overflow-hidden rounded-[1px] border border-black/20" title={driver.country}>
              <img src={driver.flagUrl} alt={driver.country} className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {/* Driver Portrait */}
        <div className="relative h-48 sm:h-52 w-full flex items-end justify-center overflow-hidden px-4">
          {/* Large Background Watermark Number */}
          <div
            className="absolute right-2 top-2 font-f1-title text-7xl font-black pointer-events-none select-none"
            style={{ color: driver.teamColor, opacity: isMotoGP ? 0.18 : 0.08 }}
          >
            {driver.number}
          </div>

          {driver.portraitUrl ? (
            <img
              src={driver.portraitUrl}
              alt={`${driver.firstName} ${driver.lastName}`}
              loading="lazy"
              className="h-full object-contain relative z-10 filter drop-shadow-md group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="h-full flex items-center font-f1-title text-5xl font-black text-[#55555F] relative z-10">
              {driver.firstName.charAt(0)}
              {driver.lastName.charAt(0)}
            </div>
          )}
        </div>

        {/* Card Footer Info */}
        <div className={`p-4 border-t ${isDark ? 'bg-[#15151C] border-[#1E1E26]' : 'bg-[#F8F8FA] border-[#ECECEE]'}`}>
          <div className="flex justify-between items-end">
            <div className="min-w-0">
              <div className="font-f1-sans text-[11px] uppercase font-bold text-[#888899]">{driver.firstName}</div>
              <div className="font-f1-title text-xl font-black uppercase tracking-tight leading-none group-hover:text-[#E10600] transition-colors">
                {driver.lastName}
              </div>
              <div className="font-f1-sans text-[10px] uppercase font-bold tracking-wider text-[#888899] mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: driver.teamColor }}></span>
                <span className="truncate max-w-[160px]">{driver.team}</span>
              </div>
            </div>

            <div className="text-right font-mono-f1 shrink-0">
              <div className="font-black text-xl text-[#E10600] leading-none">{driver.points}</div>
              <div className="text-[9px] uppercase font-bold text-[#888899] mt-0.5">PTS</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto pb-12 flex flex-col gap-8">
      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-end justify-between border-b pb-5 gap-4 ${
        isDark ? 'border-[#22222A]' : 'border-[#E2E2E8]'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-[#E10600] text-white font-f1-sans text-[10px] font-black uppercase tracking-[0.25em] px-2 py-0.5 rounded-[2px]">
              {isMotoGP ? 'FIM GRID' : 'FIA GRID'}
            </span>
            <span className="text-[10px] uppercase tracking-[0.25em] font-f1-sans font-bold text-[#888899]">
              {season} Line-up // {grid.length} {isMotoGP ? 'Riders' : 'Drivers'}
            </span>
          </div>
          <h1 className="font-f1-title text-4xl md:text-6xl font-black tracking-tight leading-none uppercase">
            CHAMPIONSHIP <span className="text-[#E10600]">GRID</span>
          </h1>
          <p className="font-f1-sans text-sm text-[#888899] mt-2 max-w-xl">
            {isMotoGP
              ? 'Rider profiles, teams and manufacturers, championship standing, and career details.'
              : 'Driver profiles, teams, official headshots, and championship standing.'}
          </p>
        </div>

        <div className="flex flex-col items-stretch md:items-end gap-2 w-full md:w-auto">
          {/* Season selector */}
          <div className="flex items-center gap-2 font-f1-sans text-xs">
              <span className="uppercase tracking-[0.2em] font-bold text-[#888899]">Season:</span>
              {seasons.map((y) => (
                <button
                  key={y}
                  onClick={() => {
                    setSeason(y);
                    setTeamFilter('ALL');
                  }}
                  className={`font-f1-sans text-xs uppercase tracking-wider font-bold px-3.5 py-1.5 rounded transition-all ${
                    season === y
                      ? 'bg-[#E10600] text-white shadow-[0_2px_8px_rgba(225,6,0,0.35)]'
                      : isDark
                      ? 'bg-[#181820] text-[#9A9AA8] border border-[#2A2A36] hover:border-[#E10600]'
                      : 'bg-[#FFFFFF] text-[#555566] border border-[#D4D4DC] hover:border-[#E10600]'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[#888899]">search</span>
            <input
              type="text"
              placeholder={isMotoGP ? 'Search rider, number, team...' : 'Search driver, code, team...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 font-f1-sans text-xs rounded border transition-all outline-none ${
                isDark
                  ? 'bg-[#14141A] border-[#2A2A36] text-white placeholder-[#666677] focus:border-[#E10600]'
                  : 'bg-[#FFFFFF] border-[#D4D4DC] text-black placeholder-[#888899] focus:border-[#E10600]'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Team Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {teams.map((team) => (
          <button
            key={team}
            onClick={() => setTeamFilter(team)}
            className={`font-f1-sans text-xs uppercase tracking-wider font-bold px-3.5 py-1.5 rounded transition-all ${
              teamFilter === team
                ? 'bg-[#E10600] text-white shadow-[0_2px_8px_rgba(225,6,0,0.35)]'
                : isDark
                ? 'bg-[#15151C] text-[#888899] border border-[#22222A] hover:text-white hover:border-[#E10600]'
                : 'bg-[#FFFFFF] text-[#555566] border border-[#E2E2E8] hover:text-black hover:border-[#E10600]'
            }`}
          >
            {team}
          </button>
        ))}
      </div>

      {loadError && <p className="font-mono-f1 text-xs text-[#E8C547]">{loadError}</p>}
      {grid.length === 0 && !loadError && (
        <p className="font-mono-f1 text-xs text-[#888899]">Loading {isMotoGP ? 'riders' : 'drivers'}…</p>
      )}

      {/* Drivers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredDrivers.map(renderCard)}
      </div>

      {/* Substitutes and wildcards (MotoGP) */}
      {filteredOthers.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-[#E10600] rounded-[2px]"></span>
            <h2 className="font-f1-title text-2xl font-black uppercase tracking-tight">
              {isMotoGP ? 'Substitutes & Wildcards' : 'Also Raced This Season'}
            </h2>
            <span className="font-f1-sans text-xs text-[#888899] uppercase tracking-[0.2em] font-bold">
              {isMotoGP ? 'Raced some rounds only' : 'Not in the latest race'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredOthers.map(renderCard)}
          </div>
        </section>
      )}
    </div>
  );
};
