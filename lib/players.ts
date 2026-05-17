import { useState, useEffect } from 'react';
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

// Hook: fetches verified Wikipedia thumbnail for a player at render time
export function useWikipediaImage(playerName: string) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!playerName) return;
    const wikiName = playerName.trim().replace(/\s+/g, '_');
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiName)}`)
      .then(r => r.json())
      .then(data => {
        if (data?.thumbnail?.source) {
          setImgUrl(data.thumbnail.source);
        }
      })
      .catch(() => {}); // silently fall back to avatar
  }, [playerName]);

  return imgUrl;
}

// 2026 Brand color mapping for glowing card borders and neon glow filters
export const TEAM_BRAND_COLORS: Record<string, { primary: string; secondary: string; shadow: string }> = {
  CSK: { primary: '#FFEA00', secondary: '#004BA0', shadow: 'rgba(255,234,0,0.45)' },
  MI: { primary: '#004BA0', secondary: '#FFD700', shadow: 'rgba(0,75,160,0.45)' },
  RCB: { primary: '#EC1C24', secondary: '#000000', shadow: 'rgba(236,28,36,0.45)' },
  KKR: { primary: '#3A225D', secondary: '#FFD700', shadow: 'rgba(58,34,93,0.45)' },
  DC: { primary: '#134187', secondary: '#D71920', shadow: 'rgba(19,65,135,0.45)' },
  PBKS: { primary: '#D71920', secondary: '#D2D2D2', shadow: 'rgba(215,25,32,0.45)' },
  RR: { primary: '#EA1A85', secondary: '#254AA5', shadow: 'rgba(234,26,133,0.45)' },
  SRH: { primary: '#FF3C00', secondary: '#000000', shadow: 'rgba(255,60,0,0.45)' },
  GT: { primary: '#0B2240', secondary: '#B99B5A', shadow: 'rgba(11,34,64,0.45)' },
  LSG: { primary: '#0057E7', secondary: '#E60000', shadow: 'rgba(0,87,231,0.45)' },
  Retired: { primary: '#8E8E93', secondary: '#3A3A3C', shadow: 'rgba(142,142,147,0.3)' }
};

// Returns an initials avatar as a reliable static fallback (used when Wikipedia image hasn't loaded yet)
export function getPlayerImageUrl(playerName: string): string {
  const initials = playerName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(playerName)}&size=400&background=0d0d1a&color=FFB300&bold=true&font-size=0.25&length=2`;
}
