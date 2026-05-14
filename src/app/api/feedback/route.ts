import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { history, aiGuess, actualPlayer } = await req.json();

    const feedbackEntry = {
      timestamp: new Date().toISOString(),
      history,
      aiGuess,
      actualPlayer,
      questionCount: history?.length || 0
    };

    const dataDir = path.join(process.cwd(), 'src/data');
    const filePath = path.join(dataDir, 'feedback.json');

    // Ensure the data directory exists
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }

    let existingData = [];
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      existingData = JSON.parse(fileContent);
      if (!Array.isArray(existingData)) {
        existingData = [];
      }
    } catch {
      // File doesn't exist or is invalid, start with empty array
      existingData = [];
    }

    existingData.push(feedbackEntry);

    await fs.writeFile(filePath, JSON.stringify(existingData, null, 2));

    return NextResponse.json({ 
      success: true, 
      message: "Thanks! We'll improve." 
    });
  } catch (error) {
    console.error('Feedback API Error:', error);
    return NextResponse.json({ error: 'Failed to record feedback' }, { status: 500 });
  }
}
