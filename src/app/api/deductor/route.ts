import { NextResponse } from 'next/server';
import { openrouter, MODEL } from '@/lib/openrouter';
import { Player } from '@/lib/players';

const SYSTEM_PROMPT = `
You are the DEDUCTOR AGENT for an IPL Akinator game.
You calculate confidence scores and pick the best guess from a filtered list.

Given the remaining candidates and the Q&A history, your job is to:
1. Determine who is the SINGLE most likely candidate (topGuess).
2. Calculate confidence (0-100%).
3. Decide if we are ready to guess (readyToGuess).

Confidence Rules:
- If 1 player remains: 98%
- If 2-3 players remain: 70-85% (Need more proof!)
- If 4+ players remain: < 50%

readyToGuess = true ONLY IF:
- (confidence >= 95% AND questionNumber >= 7)
- OR (remainingPlayers.length === 1 AND questionNumber >= 6)
- OR questionNumber >= 12 (Force a guess)
- NEVER guess before Question 6.

Respond ONLY in this exact JSON:
{
  "confidence": 87,
  "topGuess": "Player Name",
  "reasoning": "One sentence why this player is most likely based on history"
}
`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { allPlayers, history, questionNumber } = body as { allPlayers: Player[], history: any[], questionNumber: number };

    console.log(`Deductor: Processing Q${questionNumber}. Probabilistic Mode.`);

    // 1. PROBABILISTIC SCORING (Akinator-style)
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
          const expected = answer === 'yes' ? true : false;
          if (value === expected) {
            score += 15;
            matches++;
          } else {
            score -= 25; // Penalty but not instant death
            mismatches++;
          }
        }
      });

      return { name: player.name, score, matches, mismatches, player };
    });

    const sorted = scoredPlayers.sort((a, b) => b.score - a.score);
    const topCandidates = sorted.slice(0, 15);
    
    // We only keep players who haven't "failed" too many tests
    const remainingNames = sorted
      .filter(p => p.mismatches <= 2) // Allow up to 2 wrong user answers
      .map(p => p.name);

    // 2. LLM REFINEMENT
    let llmResult = { confidence: 10, topGuess: sorted[0].name, reasoning: "Analyzing patterns." };

    try {
      const response = await openrouter.chat.completions.create({
        model: MODEL,
        messages: [
          { 
            role: 'system', 
            content: `You are the IPL Akinator Deductor.
Candidates: ${JSON.stringify(topCandidates.map(c => ({ name: c.name, score: c.score, famous: c.player.famousFor })))}
History: ${history.map(h => `${h.question} -> ${h.answer}`).join('\n')}

Identify the best fit. If #1 and #2 are close, set confidence LOW.
Response JSON: { "confidence": number, "topGuess": "string", "reasoning": "string" }`
          }
        ],
        response_format: { type: 'json_object' }
      });
      const parsed = JSON.parse(response.choices[0].message.content || '{}');
      llmResult = { ...llmResult, ...parsed };
    } catch (e) {}

    // 3. ENFORCE AKINATOR RULES
    const scoreGap = sorted.length > 1 ? (sorted[0].score - sorted[1].score) : 100;
    const confidence = llmResult.confidence || 0;
    let readyToGuess = false;

    // Strict barrier: No guessing if score gap is low (uncertainty)
    if (questionNumber >= 15) {
      readyToGuess = true;
    } else if (scoreGap >= 30 && confidence >= 95 && questionNumber >= 8) {
      readyToGuess = true;
    } else if (remainingNames.length === 1 && confidence >= 98 && questionNumber >= 6) {
      readyToGuess = true;
    }

    return NextResponse.json({
      remainingPlayers: remainingNames,
      eliminatedCount: allPlayers.length - remainingNames.length,
      confidence,
      readyToGuess,
      topGuess: llmResult.topGuess || sorted[0].name,
      reasoning: llmResult.reasoning
    });

    } catch (error) {
      console.error('Critical Deductor Error:', error);
      return NextResponse.json({ 
        error: 'Failed to deduce player',
        remainingPlayers: allPlayers.map(p => p.name).slice(0, 5), // Return some candidates to avoid crash
        eliminatedCount: 0,
        confidence: 0,
        readyToGuess: false,
        topGuess: "Error occurred",
        reasoning: "Critical failure in the deduction agent."
      }, { status: 200 }); 
    }
}
