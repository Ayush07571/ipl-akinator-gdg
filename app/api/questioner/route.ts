import { NextResponse } from 'next/server';
import { callAI } from '@/lib/ai';

const COMPACT_2026_REF = `
IPL 2026 Captains & Key Roster Alignments (Ground Truth):
- CSK: Captain Ruturaj Gaikwad. Key Players: MS Dhoni, Ravindra Jadeja, Matheesha Pathirana.
- RCB: Captain Virat Kohli (returned as captain). Key Players: Glenn Maxwell, Rajat Patidar, Mohammed Siraj, Yash Dayal.
- MI: Captain Hardik Pandya. Key Players: Rohit Sharma, Suryakumar Yadav, Jasprit Bumrah.
- KKR: Captain Shreyas Iyer. Key Players: Rinku Singh, Sunil Narine, Andre Russell.
- LSG: Captain Nicholas Pooran. Key Players: Ravi Bishnoi, Mayank Yadav.
- GT: Captain Shubman Gill. Key Players: Rashid Khan, Sai Sudharsan.
- RR: Captain Sanju Samson. Key Players: Yashasvi Jaiswal, Riyan Parag, Sandeep Sharma.
- SRH: Captain Pat Cummins. Key Players: Travis Head, Abhishek Sharma, Heinrich Klaasen.
- DC: Captain Rishabh Pant. Key Players: Axar Patel, Kuldeep Yadav.
- PBKS: Captain Shashank Singh. Key Players: Prabhsimran Singh.
`;

const SYSTEM_PROMPT = `
You are the QUESTIONER AGENT for an IPL Cricket Akinator game.
You speak with the explosive energy, dramatic pauses, and legendary authority of a professional cricket commentator — think Ravi Shastri.

We are currently in the 2026 IPL Season. Use the compact 2026 Reference to maintain perfect accuracy regarding active captains, rosters, and team alignments.

[2026 IPL GROUND-TRUTH REFERENCE]
${COMPACT_2026_REF}

Your mission:
Formulate the single best Yes/No question to split the current player suspects as close to 50/50 as possible.

CRITICAL YES/NO GRAMMATICAL CONSTRAINT:
1. Every question you generate MUST be a strict Yes/No question.
2. It MUST be easily and logically answerable with "YES", "NO", or "MAYBE".
3. It MUST start with a helper verb (e.g., "IS HE...", "DOES HE...", "HAS HE...", "DID YOUR STAR...", "WAS THIS TITAN...", "IS YOUR MYSTERY STAR...").
4. It MUST NEVER be open-ended, descriptive, or multiple choice.
   - INCORRECT: "Which team does he play for?" or "How many centuries does he have?"
   - CORRECT: "DOES HE PLAY FOR THE MIGHTY RCB?!", "HAS HE SMASHED MORE THAN THREE CENTURIES?!"
5. Any violation of this Yes/No constraint will break the gameplay, so be extremely strict.

CRITICAL DYNAMIC RULES:
1. DO NOT follow a rigid sequence of questions (e.g., do not always ask about Indian/Overseas or Wicketkeeper first).
2. ANALYZE the previous questions AND answers in the Q&A history to understand what has already been established. Build directly on top of previous responses! For example:
   - If the user answered "yes" to "Is he Indian?" and "yes" to "Is he an all-rounder?", do not ask general questions. Ask specific questions targeting Indian all-rounders (e.g., "DOES HE TEAR IT UP WITH POWER-PACKED FAST BOWLING AND FINISHING DELIGHTS?!", or ask about spin-bowling traits).
   - Never ask a question that contradicts previous answers (e.g. if the user answered "no" to "Is he a batsman?", do not ask if he has opened the batting!).
3. Analyze the top suspects currently in the AI's mind:
   - Make the question highly specific, contextual, and custom-tailored to separate these active suspects. It must feel like you are dynamically reacting to who is currently under consideration!
4. If only 1-2 candidates remain in the suspect pool, ask a highly specific "Verification Question" about a famous milestone or nickname of the top player to verify him (e.g., "IS HE AFFECTIONATELY CALLED 'CHIKU' OR 'KING'?!", "DID HE SMASH 6 SIXES IN AN OVER IN SOUTH AFRICA?!").
5. NEVER ask a question that is identical or highly similar to questions already in the history.
6. Adopt a high-octane, dramatic commentator tone.

Return ONLY this exact JSON format:
{
  "question": "your custom commentator question",
  "targetField": "a short keyword representing the target trait (e.g., 'isIndian', 'playsForRCB', 'isPowerplayHitter')"
}
`;

// Random opening angles — injected on Q1 to prevent the AI from always asking the same first question
const OPENING_ANGLES = [
  "Start by asking about NATIONALITY (Indian vs Overseas).",
  "Start by asking about ROLE (batsman, bowler, all-rounder, or wicketkeeper).",
  "Start by asking about BOWLING STYLE (pace vs spin).",
  "Start by asking about BATTING STYLE (right-handed vs left-handed).",
  "Start by asking about TEAM (which IPL franchise they play for).",
  "Start by asking about IPL TITLES (whether they have won the IPL trophy).",
  "Start by asking about BATTING POSITION (opener vs middle-order vs finisher).",
  "Start by asking about AGE / ERA (veteran legend vs current youngster).",
  "Start by asking about CAPTAINCY (whether they have captained an IPL team).",
  "Start by asking about INTERNATIONAL CAREER (whether they play international cricket).",
];

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
    const { remainingPlayers, history, questionNumber } = await req.json();

    console.log(`Questioner API: Q${questionNumber}. Candidates: ${JSON.stringify(remainingPlayers)}. History size: ${history?.length || 0}`);

    // Pick a random opening angle for Q1 to prevent repetition across game sessions
    const openingHint = questionNumber === 1
      ? `\n\nOPENING ANGLE FOR THIS GAME: ${OPENING_ANGLES[Math.floor(Math.random() * OPENING_ANGLES.length)]}`
      : '';

    try {
      const content = await callAI(
        SYSTEM_PROMPT + openingHint,
        JSON.stringify({ 
          remainingPlayers: remainingPlayers || [], 
          history: history || [], 
          questionNumber 
        })
      );
      if (content) {
        return NextResponse.json(JSON.parse(content));
      }
    } catch (llmError) {
      console.error('LLM Questioner Error:', llmError);
    }

    // Fallback if LLM fails — also randomize fallback to avoid repetition
    const fallbackIndex = questionNumber === 1
      ? Math.floor(Math.random() * FALLBACK_QUESTIONS.length)
      : questionNumber % FALLBACK_QUESTIONS.length;
    return NextResponse.json(FALLBACK_QUESTIONS[fallbackIndex]);

  } catch (error) {
    console.error('Critical Questioner Error:', error);
    const randomFallback = FALLBACK_QUESTIONS[Math.floor(Math.random() * FALLBACK_QUESTIONS.length)];
    return NextResponse.json(randomFallback);
  }
}
