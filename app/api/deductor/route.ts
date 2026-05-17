import { NextResponse } from 'next/server';
import { callAI } from '@/lib/ai';
import { Player } from '@/lib/players';

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
You are the DEDUCTOR AGENT for an IPL Cricket Akinator game.
Your job is to analyze the Q&A history, calculate confidence scores, and identify the most probable candidates from all active and historical IPL players who have ever played in the tournament.

We are currently in the 2026 IPL Season. Use the compact 2026 Reference to maintain perfect accuracy regarding active captains, rosters, and team alignments.

[2026 IPL GROUND-TRUTH REFERENCE]
${COMPACT_2026_REF}

Guidelines for Answer Evaluation:
- "yes": Strong match. Players NOT possessing the trait get probability heavily reduced.
- "no": Strong mismatch. Players possessing the trait get probability heavily reduced.
- "maybe": Soft constraint. Matching players are slightly favored; non-matching not eliminated.
- "dont_know": Completely neutral — ignore entirely, make zero probability adjustments.

ERROR TOLERANCE (CRITICAL):
Users may give 1-2 incorrect answers by mistake. Do NOT eliminate candidates entirely based on a single contradictory answer. Instead:
- Reduce probability significantly (by 50-70%) on a contradiction, but never set to 0% unless there are 3+ contradictions for that player.
- Always keep at least 3-5 candidates alive with non-zero probabilities until confidence is very high.
- If a previously eliminated player suddenly matches several later answers very strongly, allow them to re-enter the candidate pool with moderate probability.
- Treat the overall pattern of answers as more reliable than any single answer.

IMPORTANT OPEN-ENDED POOL CONSTRAINTS:
1. The player can be ANY active, retired, overseas, domestic, famous, or obscure cricketer who has played at least one match in IPL history from 2008 to 2026.
2. DO NOT limit your deductions to any static list. Search your global knowledge of all IPL teams across all seasons.
3. Support extremely niche historical players (e.g. Paul Valthaty, Swapnil Singh, Kamran Khan, Saurabh Netravalkar, Manvinder Bisla) as well as global superstars.
4. Propose the top 10 most probable players currently matching the history.
5. For each candidate, specify their name, current active/retired team, main role (e.g., Batsman, Bowler, All-rounder, Wicketkeeper-Batsman), and probability percentage (0-100%).
6. Ensure the sum of all probability percentages is <= 100%.
7. Set "readyToGuess" to true ONLY when the top candidate's probability reaches >= 80%. There is NO question limit — keep asking until truly confident.

Return ONLY this exact JSON format:
{
  "candidates": [
    { "name": "Virat Kohli", "probability": 85, "team": "RCB", "role": "Batsman" },
    { "name": "Faf du Plessis", "probability": 10, "team": "RCB", "role": "Batsman" }
  ],
  "readyToGuess": true,
  "topGuess": "Virat Kohli",
  "reasoning": "Matching 2026 RCB squad, elite top-order anchor, and captaincy history."
}
`;

export async function POST(req: Request) {
  let allPlayers: Player[] = [];
  let history: any[] = [];
  let questionNumber = 1;

  try {
    const body = await req.json();
    allPlayers = body.allPlayers || [];
    history = body.history || [];
    questionNumber = body.questionNumber || 1;

    console.log(`Deductor API: Processing Q${questionNumber}. Open-Ended Dynamic Mode. History size: ${history.length}`);

    try {
      const content = await callAI(
        SYSTEM_PROMPT,
        JSON.stringify({ 
          history: history.map(h => ({ question: h.question, answer: h.answer })),
          questionNumber 
        })
      );
      if (content) {
        const parsed = JSON.parse(content);
        if (parsed.candidates && Array.isArray(parsed.candidates)) {
          const candidates = parsed.candidates;
          const topGuess = parsed.topGuess || candidates[0]?.name || "Unknown Player";
          const confidence = candidates[0]?.probability || 0;
          const readyToGuess = parsed.readyToGuess || confidence >= 80 || questionNumber >= 12;
          const remainingPlayers = candidates.map((c: any) => c.name);

          return NextResponse.json({
            candidates,
            remainingPlayers,
            eliminatedCount: Math.max(0, 80 - remainingPlayers.length),
            confidence,
            readyToGuess,
            topGuess,
            reasoning: parsed.reasoning || "Analyzing patterns."
          });
        }
      }
    } catch (llmError) {
      console.error('LLM Deductor Error:', llmError);
    }

    // FALLBACK LOGIC: If LLM fails, run simple local math so the game never crashes
    console.log("Deductor: LLM Failed. Running local math fallback.");
    const scoredPlayers = allPlayers.map(player => {
      let score = 0;
      let matches = 0;
      let mismatches = 0;

      history.forEach(step => {
        const qField = step.targetField?.trim();
        const { answer } = step;
        if (!qField || !answer || answer === 'maybe' || answer === 'dont_know') return;

        let value = (player as any)[qField];
        if (value === undefined) {
          const actualKey = Object.keys(player).find(k => k.toLowerCase() === qField.toLowerCase());
          if (actualKey) value = (player as any)[actualKey];
        }

        if (value === undefined) return;

        if (typeof value === 'boolean') {
          const expected = answer === 'yes';
          if (value === expected) {
            score += 15;
            matches++;
          } else {
            score -= 25;
            mismatches++;
          }
        }
      });

      return { name: player.name, score, matches, mismatches, player };
    });

    const sorted = scoredPlayers.sort((a, b) => b.score - a.score);
    const topCandidates = sorted.slice(0, 10);
    const totalScore = topCandidates.reduce((acc, c) => acc + Math.max(0, c.score), 0) || 1;
    
    const candidates = topCandidates.map(c => ({
      name: c.name,
      probability: Math.round((Math.round(Math.max(0, c.score)) / totalScore) * 100),
      team: c.player.currentTeam,
      role: c.player.role
    }));

    const remainingNames = topCandidates.map(c => c.name);
    const confidence = candidates[0]?.probability || 10;
    const readyToGuess = questionNumber >= 12;

    return NextResponse.json({
      candidates,
      remainingPlayers: remainingNames,
      eliminatedCount: allPlayers.length - remainingNames.length,
      confidence,
      readyToGuess,
      topGuess: candidates[0]?.name || sorted[0].name,
      reasoning: "Local score matches."
    });

  } catch (error) {
    console.error('Critical Deductor Error:', error);
    return NextResponse.json({
      candidates: [{ name: "MS Dhoni", probability: 50, team: "CSK", role: "Wicketkeeper-Batsman" }],
      remainingPlayers: ["MS Dhoni"],
      eliminatedCount: 0,
      confidence: 10,
      readyToGuess: false,
      topGuess: "Error occurred",
      reasoning: "Critical failure in the deduction agent."
    });
  }
}
