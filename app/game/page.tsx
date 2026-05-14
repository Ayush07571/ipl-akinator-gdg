'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  RefreshCcw, 
  CheckCircle2, 
  XCircle, 
  BrainCircuit, 
  ChevronRight, 
  Target,
  Flame,
  Search,
  Users
} from 'lucide-react';
import { players as allPlayersData } from '@/lib/players';
import confetti from 'canvas-confetti';

type GamePhase = 'thinking' | 'questioning' | 'guessing' | 'correct' | 'wrong';

interface HistoryItem {
  question: string;
  targetField: string;
  answer: 'yes' | 'no' | 'maybe' | 'dont_know';
}

export default function GamePage() {
  // Game State
  const [remainingPlayers, setRemainingPlayers] = useState<string[]>(allPlayersData.map(p => p.name));
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<{ question: string; targetField: string } | null>(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [confidence, setConfidence] = useState(0);
  const [bgElements, setBgElements] = useState<{top: string, left: string, duration: number}[]>([]);
  const [gamePhase, setGamePhase] = useState<GamePhase>('thinking');
  const [topGuess, setTopGuess] = useState<string>('');
  const [reasoning, setReasoning] = useState<string>('');
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [feedbackPlayer, setFeedbackPlayer] = useState('');

  // Derived State
  const eliminatedPlayers = useMemo(() => 
    allPlayersData.filter(p => !remainingPlayers.includes(p.name)).map(p => p.name), 
    [remainingPlayers]
  );

  const fetchFirstQuestion = async () => {
    setIsApiLoading(true);
    setGamePhase('thinking');
    try {
      const res = await fetch('/api/questioner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remainingPlayers: allPlayersData.map(p => p.name),
          questionsAsked: [],
          questionNumber: 1
        })
      });
      const data = await res.json();
      setCurrentQuestion({ question: data.question, targetField: data.targetField });
      setGamePhase('questioning');
    } catch (error) {
      console.error('Failed to start game:', error);
    } finally {
      setIsApiLoading(false);
    }
  };

  // Initialize Game & Background
  useEffect(() => {
    // Background elements to avoid hydration mismatch
    setBgElements([...Array(6)].map((_, i) => ({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      duration: 15 + i * 2
    })));

    const init = async () => {
      await fetchFirstQuestion();
    };
    init();
  }, []);

  const handleAnswer = async (answer: 'yes' | 'no' | 'maybe' | 'dont_know') => {
    if (!currentQuestion || isApiLoading) return;

    setIsApiLoading(true);
    setGamePhase('thinking');

    const newHistoryItem: HistoryItem = {
      question: currentQuestion.question,
      targetField: currentQuestion.targetField,
      answer
    };
    const newHistory = [...history, newHistoryItem];
    setHistory(newHistory);

    try {
      // 1. DEDUCTION PHASE
      const deductorRes = await fetch('/api/deductor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allPlayers: allPlayersData,
          history: newHistory,
          questionNumber: questionNumber
        })
      });
      const dedData = await deductorRes.json();

      setRemainingPlayers(dedData.remainingPlayers);
      setConfidence(dedData.confidence);
      setTopGuess(dedData.topGuess);
      setReasoning(dedData.reasoning);

      if (dedData.readyToGuess || questionNumber >= 12) {
        setGamePhase('guessing');
        return;
      }

      // 2. NEXT QUESTION PHASE
      const questionerRes = await fetch('/api/questioner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remainingPlayers: dedData.remainingPlayers,
          questionsAsked: newHistory.map(h => h.question),
          questionNumber: questionNumber + 1
        })
      });
      const qData = await questionerRes.json();

      // Prevent exact duplicate questions if AI fails
      if (newHistory.some(h => h.question === qData.question)) {
        setGamePhase('guessing'); // Force guess if stuck in loop
        return;
      }

      setCurrentQuestion({ question: qData.question, targetField: qData.targetField });
      setQuestionNumber(prev => prev + 1);
      setGamePhase('questioning');

    } catch (error) {
      console.error('Game logic error:', error);
      // Only fallback to guessing if we have enough questions, otherwise stay here
      if (questionNumber >= 8) {
        setGamePhase('guessing');
      } else {
        setIsApiLoading(false);
        // Maybe try to fetch another question or just stop loading
      }
    } finally {
      setIsApiLoading(false);
    }
  };

  const handleResult = (correct: boolean) => {
    if (correct) {
      setGamePhase('correct');
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f5a623', '#1e3a8a', '#ffffff']
      });
    } else {
      setGamePhase('wrong');
    }
  };

  const submitFeedback = async () => {
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: history,
          aiGuess: topGuess,
          actualPlayer: feedbackPlayer
        })
      });
      restartGame();
    } catch (error) {
      console.error('Feedback error:', error);
    }
  };

  const restartGame = () => {
    setRemainingPlayers(allPlayersData.map(p => p.name));
    setHistory([]);
    setQuestionNumber(1);
    setConfidence(0);
    setGamePhase('thinking');
    setTopGuess('');
    setReasoning('');
    setFeedbackPlayer('');
    fetchFirstQuestion();
  };

  return (
    <div className="h-screen bg-[#020208] text-white font-sans overflow-hidden relative perspective-1000">
      {/* 3D ARENA BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,rgba(245,166,35,0.05)_0%,transparent_70%)]" />
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        
        {/* Floating 3D-like elements */}
        {bgElements.map((el, i) => (
          <motion.div
            key={i}
            animate={{ 
              y: [0, -100, 0],
              rotate: [0, 360],
              x: [0, i % 2 === 0 ? 50 : -50, 0]
            }}
            transition={{ 
              duration: el.duration, 
              repeat: Infinity, 
              ease: "linear" 
            }}
            className="absolute opacity-10"
            style={{
              top: el.top,
              left: el.left,
            }}
          >
            <div className="w-16 h-16 border-2 border-ipl-gold/20 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 bg-ipl-gold/10 rounded-full blur-sm" />
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {gamePhase === 'guessing' && (
          <GuessOverlay name={topGuess} onResult={handleResult} />
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 h-screen relative z-10">
        
        {/* LEFT PANEL: Suspect Pool */}
        <div className="hidden lg:flex lg:col-span-3 border-r border-white/5 flex-col bg-[#05050a]/50 backdrop-blur-sm pt-8">
          <div className="px-6 mb-4">
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 shadow-sm">
              <h2 className="flex items-center gap-2 text-[10px] font-black text-ipl-gold tracking-[0.3em] mb-2 uppercase">
                <Users size={14} /> Intelligence Pool
              </h2>
              <div className="flex items-baseline gap-2">
                <motion.div 
                  key={remainingPlayers.length}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-4xl font-black text-white"
                >
                  {remainingPlayers.length}
                </motion.div>
                <div className="text-[8px] font-black text-gray-600 uppercase tracking-tighter">Remaining</div>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto px-6 custom-scrollbar pb-8">
            <div className="grid grid-cols-2 gap-2">
              {allPlayersData.map((player) => {
                const isEliminated = eliminatedPlayers.includes(player.name);
                return (
                  <motion.div
                    key={player.name}
                    className={`px-2 py-1.5 rounded-lg text-[8px] font-black text-center transition-all border ${
                      isEliminated 
                        ? 'bg-transparent border-white/5 text-gray-800 line-through' 
                        : 'bg-white/5 text-gray-400 border-white/10 hover:border-ipl-gold/50 cursor-default'
                    }`}
                  >
                    {player.name}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CENTER PANEL: Question Area */}
        <div className="col-span-1 lg:col-span-6 flex flex-col items-center justify-start pt-12 p-4 relative">
          {/* COMPACT HEADER */}
          <div className="text-center mb-6 z-10">
            <motion.h1 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-2xl md:text-3xl font-black tracking-tighter text-white uppercase italic leading-none"
            >
              IPL <span className="text-transparent bg-clip-text bg-linear-to-r from-ipl-gold to-orange-500">AKINATOR</span>
            </motion.h1>
            <div className="text-[7px] font-black tracking-[0.3em] text-gray-500 uppercase mt-1">ENGINE v4.0</div>
          </div>

          <div className="w-full max-w-xl">
            {gamePhase === 'correct' ? (
              <ResultScreen 
                type="correct" 
                qCount={history.length} 
                confidence={confidence} 
                onRestart={restartGame} 
                player={topGuess}
              />
            ) : gamePhase === 'wrong' ? (
              <ResultScreen 
                type="wrong" 
                feedback={feedbackPlayer} 
                setFeedback={setFeedbackPlayer} 
                onSubmit={submitFeedback} 
                onRestart={restartGame} 
              />
            ) : (
              <motion.div
                key={questionNumber}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0f0f1a] border border-white/5 rounded-[2rem] p-6 md:p-8 shadow-2xl relative overflow-hidden group z-10 w-full max-w-lg"
              >
                <div className="absolute top-0 left-0 w-full h-[2px] bg-linear-to-r from-transparent via-ipl-gold to-transparent" />
                
                <div className="flex flex-col items-center">
                  <div className="mb-4 flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                    <BrainCircuit size={14} className="text-ipl-gold" />
                    <span className="text-[8px] font-black tracking-widest text-gray-400 uppercase">QUESTION {questionNumber} OF 12</span>
                  </div>

                  <h2 className="text-sm md:text-lg font-black text-center mb-4 leading-tight min-h-10 flex items-center">
                    {isApiLoading ? (
                      <span className="flex gap-2">
                        <span className="w-3 h-3 bg-ipl-gold rounded-full animate-bounce" />
                        <span className="w-3 h-3 bg-ipl-gold rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="w-3 h-3 bg-ipl-gold rounded-full animate-bounce [animation-delay:0.4s]" />
                      </span>
                    ) : (
                      currentQuestion?.question
                    )}
                  </h2>

                  <div className="grid grid-cols-2 gap-4 w-full">
                    {[
                      { label: 'YES', val: 'yes', icon: '✅', color: 'hover:bg-green-500/20 hover:border-green-500/50' },
                      { label: 'NO', val: 'no', icon: '❌', color: 'hover:bg-red-500/20 hover:border-red-500/50' },
                      { label: 'MAYBE', val: 'maybe', icon: '🤷', color: 'hover:bg-yellow-500/20 hover:border-yellow-500/50' },
                      { label: 'DON\'T KNOW', val: 'dont_know', icon: '❓', color: 'hover:bg-blue-500/20 hover:border-blue-500/50' },
                    ].map((btn) => (
                      <button
                        key={btn.val}
                        onClick={() => handleAnswer(btn.val as 'yes' | 'no' | 'maybe' | 'dont_know')}
                        disabled={isApiLoading}
                        className={`group relative py-2.5 bg-white/5 border border-white/10 rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-50 overflow-hidden ${btn.color}`}
                      >
                        <motion.div 
                          className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
                          whileHover={{ x: ['-100%', '100%'] }}
                          transition={{ duration: 0.8 }}
                        />
                        <span className="mr-2 opacity-50 group-hover:opacity-100 transition-opacity">{btn.icon}</span>
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Confidence Meter */}
        <div className="hidden lg:flex lg:col-span-3 border-l border-white/5 flex-col bg-[#05050a]/50 backdrop-blur-sm pt-8">
          <div className="px-8 flex-1 flex flex-col items-center">
            <h2 className="flex items-center gap-2 text-[10px] font-black text-ipl-gold tracking-[0.3em] mb-8 uppercase">
              <Target size={14} /> AI Analysis
            </h2>

            <div className="flex-1 w-full max-w-[60px] flex flex-col items-center justify-center py-4 max-h-[300px]">
              <div className="relative h-full w-full bg-white/5 rounded-full border border-white/5 p-1 flex flex-col justify-end overflow-hidden">
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${confidence}%` }}
                  transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                  className="w-full rounded-full bg-linear-to-t from-orange-600 via-ipl-gold to-yellow-200 shadow-[0_0_30px_rgba(245,166,35,0.3)]"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-xl font-black text-white mix-blend-difference rotate-[-90deg]">{confidence}%</div>
                </div>
              </div>
            </div>

            <div className="mt-auto w-full space-y-4">
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                <div className="text-[8px] font-black text-gray-500 mb-2 uppercase tracking-widest flex items-center gap-2">
                  <BrainCircuit size={10} className="text-ipl-gold" /> AI STATUS
                </div>
                <div className="text-[10px] font-bold leading-relaxed italic text-gray-300">
                  {isApiLoading ? "Analyzing..." : reasoning || "Awaiting move..."}
                </div>
              </div>

              {history.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest px-2">RECENT LOGS</div>
                  {history.slice(-2).map((item, i) => (
                    <div key={i} className="flex justify-between items-center bg-white/5 rounded-lg px-3 py-1.5 text-[8px]">
                      <span className="text-gray-500 truncate max-w-[100px] font-bold">{item.question}</span>
                      <span className="font-black text-ipl-gold uppercase">{item.answer}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GuessOverlay({ name, onResult }: { name: string; onResult: (correct: boolean) => void }) {
  const [countdown, setCountdown] = useState(3);
  const showResult = countdown === 0;

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 800);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center text-center p-6"
    >
      <div className="absolute inset-0 bg-radial-gradient from-ipl-blue/20 to-transparent pointer-events-none" />
      
      {!showResult ? (
        <motion.div
          key={countdown}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 2, opacity: 0 }}
          className="text-[12rem] font-black italic text-ipl-gold tracking-tighter"
        >
          {countdown}
        </motion.div>
      ) : (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="max-w-2xl w-full"
        >
          <div className="text-ipl-gold font-black tracking-[0.5em] mb-4 uppercase">THE AI READS YOUR MIND...</div>
          <h2 className="text-2xl text-gray-400 font-bold mb-8 italic">You are thinking of...</h2>
          
          <div className="relative mb-12">
            <div className="absolute -inset-4 bg-ipl-gold/20 blur-3xl rounded-full" />
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter italic bg-linear-to-br from-white to-gray-500 bg-clip-text text-transparent drop-shadow-2xl">
              {(name || "Secret Player").toUpperCase()}
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => onResult(true)}
              className="px-10 py-5 bg-ipl-gold text-ipl-bg font-black rounded-2xl text-2xl hover:shadow-[0_0_40px_rgba(245,166,35,0.4)] transition-all flex items-center gap-3 justify-center"
            >
              <CheckCircle2 size={32} /> 🎉 CORRECT!
            </button>
            <button 
              onClick={() => onResult(false)}
              className="px-10 py-5 bg-white/5 border border-white/10 font-black rounded-2xl text-2xl hover:bg-red-500/10 hover:border-red-500/50 transition-all flex items-center gap-3 justify-center"
            >
              <XCircle size={32} /> ❌ WRONG
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

interface ResultScreenProps {
  type: 'correct' | 'wrong';
  qCount?: number;
  confidence?: number;
  onRestart: () => void;
  player?: string;
  feedback?: string;
  setFeedback?: (val: string) => void;
  onSubmit?: () => void;
}

function ResultScreen({ type, qCount, confidence, onRestart, player, feedback, setFeedback, onSubmit }: ResultScreenProps) {
  if (type === 'correct') {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center"
      >
        <div className="w-32 h-32 bg-ipl-gold rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 rotate-6 shadow-2xl shadow-ipl-gold/20">
          <Trophy size={64} className="text-ipl-bg" />
        </div>
        <h2 className="text-5xl md:text-7xl font-black tracking-tighter italic mb-4">BOWLED &apos;EM OUT! 🏏</h2>
        <p className="text-2xl text-gray-400 mb-12">The AI has triumphed again! You were indeed thinking of <span className="text-ipl-gold font-black uppercase">{player || "the mystery player"}</span>.</p>
        
        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-12">
          <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
            <div className="text-3xl font-black text-ipl-accent">{qCount}</div>
            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">QUESTIONS</div>
          </div>
          <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
            <div className="text-3xl font-black text-ipl-gold">{confidence}%</div>
            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">CONFIDENCE</div>
          </div>
        </div>

        <button 
          onClick={onRestart}
          className="px-12 py-5 bg-ipl-gold text-ipl-bg font-black rounded-2xl text-2xl hover:shadow-[0_0_40px_rgba(245,166,35,0.4)] transition-all flex items-center gap-3 mx-auto"
        >
          <RefreshCcw /> PLAY AGAIN
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="text-center max-w-md mx-auto"
    >
      <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-500/30">
        <Flame size={48} className="text-red-500" />
      </div>
      <h2 className="text-4xl font-black tracking-tighter italic mb-4 uppercase">DEFEAT?! NO WAY! 😤</h2>
      <p className="text-gray-400 mb-12 font-bold leading-relaxed">
        My algorithms have failed me! Help my digital brain grow — who was your mystery player?
      </p>
      
      <div className="relative mb-6">
        <input 
          type="text" 
          value={feedback}
          onChange={(e) => setFeedback?.(e.target.value)}
          placeholder="ENTER PLAYER NAME"
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-xl font-black placeholder:text-gray-700 focus:outline-none focus:border-ipl-gold transition-all"
        />
        <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-700" />
      </div>

      <button 
        onClick={() => onSubmit?.()}
        className="w-full py-5 bg-ipl-gold text-ipl-bg font-black rounded-2xl text-xl mb-4 hover:shadow-[0_0_30px_rgba(245,166,35,0.3)] transition-all"
      >
        SUBMIT & RESTART
      </button>

      <button 
        onClick={onRestart}
        className="w-full py-4 bg-white/5 font-black rounded-2xl text-gray-500 hover:text-white transition-all"
      >
        JUST PLAY AGAIN
      </button>
    </motion.div>
  );
}
