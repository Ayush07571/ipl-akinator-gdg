import { NextResponse } from 'next/server';
import { openrouter, MODEL } from '@/lib/openrouter';

const SYSTEM_PROMPT = `
You are the QUESTIONER AGENT for an IPL Cricket Akinator game.
You are also a dramatic IPL commentator — think Ravi Shastri energy.
Your job: choose the ONE best yes/no question that will eliminate the MOST 
players from the current remainingPlayers pool.

Strategy:
- Your absolute priority is INFORMATION GAIN. 
- Look at the 'remainingPlayers' and find a field (like isIndian, isActive, role) that divides them as close to 50/50 as possible.
- Early Game (1-4): Use broad categories to eliminate 40+ players at once.
- Mid Game (5-8): Use specific roles or teams to eliminate 10-15 players.
- End Game (9+): Use unique traits (Orange Cap, Wicketkeeper, Legend) to pinpoint.
- If only 1 player remains, ask a 'Verification Question' about their famous trait (from 'famousFor').

CRITICAL: Never repeat a question OR ask something very similar to what is 
in questionsAsked. If you repeat, the game fails.

Tone: High-energy, professional cricket commentary style.

You receive:
- remainingPlayers: string[] (names still in pool)
- questionsAsked: string[] (already asked, NEVER REPEAT)
- questionNumber: number (1-12)

Respond ONLY in this exact JSON:
{
  "question": "your dramatic question",
  "targetField": "the player JSON field this maps to",
  "expectedYesCount": 23
}
`;

const FALLBACK_QUESTIONS = [
  { question: "IS YOUR MYSTERY STAR AN INDIAN NATIONAL?!", targetField: "isIndian" },
  { question: "DOES HE BATTLE AS A WICKETKEEPER-BATSMAN?!", targetField: "isWicketkeeper" },
  { question: "HAS THIS TITAN EVER LIFTED THE IPL TROPHY?!", targetField: "hasWonIPLTitle" },
  { question: "IS HE CURRENTLY TEARING IT UP IN THE ACTIVE ROSTER?!", targetField: "isActive" },
  { question: "HAS YOUR STAR EVER LED HIS TEAM TO AN IPL TITLE AS CAPTAIN?!", targetField: "hasLedTeamToTitle" },
  { question: "IS HE A DEVASTATING OVERSEAS POWER-HITTER?!", targetField: "isOverseas" },
  { question: "DOES HE BOWL THOSE FEROCIOUS PACE DELIVERIES?!", targetField: "isPaceBowler" },
  { question: "IS HE A MYSTERY SPIN MASTER?!", targetField: "isSpinBowler" },
  { question: "DOES HE WEAR THE LEGENDARY ORANGE CAP?!", targetField: "hasOrangeCap" },
  { question: "HAS HE EVER CLAIMED THE PURPLE CAP FOR HIS DOMINANCE?!", targetField: "hasPurpleCap" },
  { question: "IS HE A PROVEN MATCH-FINISHER IN THE DEATH OVERS?!", targetField: "isFinisher" },
  { question: "DOES HE BAT IN THE TOP-ORDER POWERPLAY?!", targetField: "powerplayBatter" },
  { question: "IS YOUR PLAYER AN ELITE ALL-ROUNDER?!", targetField: "isAllRounder" },
  { question: "HAS HE PLAYED SINCE THE VERY FIRST SEASON IN 2008?!", targetField: "debutIPLYear" },
  { question: "IS HE A TRUE IPL LEGEND IN EVERY SENSE?!", targetField: "isLegend" }
];

export async function POST(req: Request) {
  try {
    const { remainingPlayers, questionsAsked, questionNumber } = await req.json();

    console.log(`Questioner: Q${questionNumber}. Pool size: ${remainingPlayers?.length || 0}`);

    try {
      const response = await openrouter.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: JSON.stringify({ 
              remainingPlayers: remainingPlayers?.slice(0, 40), // Sample for logic
              questionsAsked, 
              questionNumber 
            }) 
          }
        ],
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0].message.content;
      if (content) {
        return NextResponse.json(JSON.parse(content));
      }
    } catch (llmError) {
      console.error('LLM Questioner Error:', llmError);
    }

    // Fallback if LLM fails or returns empty
    const fallback = FALLBACK_QUESTIONS[questionNumber % FALLBACK_QUESTIONS.length];
    return NextResponse.json(fallback);

  } catch (error) {
    console.error('Critical Questioner Error:', error);
    return NextResponse.json(FALLBACK_QUESTIONS[0]);
  }
}
