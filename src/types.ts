export type NavigationTab = 'standings' | 'live' | 'drivers' | 'results' | 'analysis' | 'weather' | 'history';

export interface Driver {
  id: string;
  rank: number;
  number: number;
  firstName: string;
  lastName: string;
  code: string;
  team: string;
  teamColor: string;
  teamSecondaryColor?: string;
  points: number;
  wins: number;
  podiums: number;
  country: string;
  flagUrl: string;
  portraitUrl: string;
  carNumber: number;
  fastestLaps?: number;
  poles?: number;
  worldTitles?: number;
  bio?: string;
}

export interface Constructor {
  id: string;
  rank: number;
  name: string;
  points: number;
  wins: number;
  podiums: number;
  accentColor: string;
  engine: string;
  drivers: string[];
}

export interface ClassificationRow {
  pos: number | 'NC';
  driver: string;
  driverCode: string;
  team: string;
  timeRet: string;
  pts: number;
  gap?: string;
  status?: 'finished' | 'dnf' | 'lap';
  tireCompound?: 'SOFT' | 'MEDIUM' | 'HARD' | 'INTER' | 'WET';
}

export interface LiveTelemetryData {
  speed: number;
  rpm: number;
  gear: number;
  throttle: number;
  brake: number;
  drs: boolean;
  tireWear: number;
  fuelLoad: number;
  lap: number;
  totalLaps: number;
  bestLap: string;
  currentLap: string;
  topSpeed: number;
  trackTemp: number;
  airTemp: number;
  sectors: {
    s1: { time: string; status: 'purple' | 'green' | 'yellow' };
    s2: { time: string; status: 'purple' | 'green' | 'yellow' };
    s3: { time: string; status: 'purple' | 'green' | 'yellow' };
  };
}

export interface RaceEvent {
  id: string;
  round: number;
  name: string;
  circuit: string;
  country: string;
  flagUrl: string;
  date: string;
  status: 'completed' | 'live' | 'upcoming';
  winner?: string;
  winnerTeam?: string;
  winnerTime?: string;
  polePosition?: string;
  fastestLap?: string;
}

export type ThemeMode = 'dark' | 'light';
