import playersData from '@/data/ipl-players.json';

export interface Player {
  id: number;
  name: string;
  country: string;
  isIndian: boolean;
  role: string;
  battingStyle: string;
  bowlingStyle: string;
  primaryTeams: string[];
  currentTeam: string;
  isActive: boolean;
  isCaptain: boolean;
  hasWonIPLTitle: boolean;
  titlesWon: number;
  isWicketkeeper: boolean;
  isFinisher: boolean;
  battingPosition: string;
  deathOverSpecialist: boolean;
  powerplayBatter: boolean;
  isPaceBowler: boolean;
  isSpinBowler: boolean;
  isAllRounder: boolean;
  hasOrangeCap: boolean;
  hasPurpleCap: boolean;
  hasCaptainedTeam: boolean;
  hasLedTeamToTitle: boolean;
  isLegend: boolean;
  internationalCareer: boolean;
  debutIPLYear: number;
  isOverseas: boolean;
  ageBracket: string;
  battingTier: string;
  bowlingTier: string;
  famousFor: string[];
}

export const players = playersData as Player[];

export function getPlayerById(id: number): Player | undefined {
  return players.find((p) => p.id === id);
}

export function getRandomPlayer(): Player {
  const randomIndex = Math.floor(Math.random() * players.length);
  return players[randomIndex];
}
