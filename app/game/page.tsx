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
  Users,
  Activity,
  ShieldAlert
} from 'lucide-react';
import { players as allPlayersData, TEAM_BRAND_COLORS, getPlayerImageUrl } from '@/lib/players';
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
  const [candidates, setCandidates] = useState<{ name: string; probability: number; team: string; role: string; }[]>([]);
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

  // API Health Diagnostic State
  const [healthStatus, setHealthStatus] = useState<'loading' | 'healthy' | 'degraded' | 'offline'>('loading');
  const [activeProvider, setActiveProvider] = useState<string>('Detecting...');
  const [apiLatency, setApiLatency] = useState<number | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  const checkSystemHealth = async () => {
    setCheckingHealth(true);
    setHealthStatus('loading');
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealthStatus(data.status);
      setActiveProvider(data.provider);
      setApiLatency(data.latency);
    } catch (e) {
      setHealthStatus('offline');
      setActiveProvider('Local Fallback');
      setApiLatency(null);
    } finally {
      setCheckingHealth(false);
    }
  };

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
          remainingPlayers: [],
          history: [],
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
      await checkSystemHealth();
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

      setRemainingPlayers(dedData.remainingPlayers || []);
      setCandidates(dedData.candidates || []);
      setConfidence(dedData.confidence || 0);
      setTopGuess(dedData.topGuess || "Secret Player");
      setReasoning(dedData.reasoning || "Analyzing details.");

      if (dedData.readyToGuess) {
        setGamePhase('guessing');
        return;
      }

      // 2. NEXT QUESTION PHASE
      const questionerRes = await fetch('/api/questioner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remainingPlayers: dedData.remainingPlayers,
          history: newHistory,
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
      // Only fallback to guessing if we have many questions answered
      if (questionNumber >= 20) {
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
    setCandidates([]);
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
          <GuessOverlay name={topGuess} confidence={confidence} onResult={handleResult} />
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 h-screen relative z-10">
        
        {/* LEFT PANEL: Live AI Suspect Board */}
        <div className="hidden lg:flex lg:col-span-3 border-r border-white/5 flex-col bg-[#05050a]/50 backdrop-blur-sm pt-8">
          <div className="px-6 mb-4">
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 shadow-sm">
              <h2 className="flex items-center gap-2 text-[10px] font-black text-ipl-gold tracking-[0.3em] mb-2 uppercase">
                <Users size={14} /> Intelligence Pool
              </h2>
              <div className="flex items-baseline gap-2">
                <motion.div 
                  key={candidates.length}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-4xl font-black text-white"
                >
                  {candidates.length || allPlayersData.length}
                </motion.div>
                <div className="text-[8px] font-black text-gray-600 uppercase tracking-tighter">Suspects Pool</div>
              </div>
            </div>
          </div>
          
          {/* API SYSTEM HEALTH MONITOR */}
          <div className="px-6 mb-4">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 shadow-sm flex flex-col gap-2.5 relative overflow-hidden group">
              <div className="flex justify-between items-center relative z-10">
                <div className="flex items-center gap-2">
                  <Activity size={12} className="text-gray-400 animate-pulse" />
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">AI Connection Status</span>
                </div>
                
                {/* Glowing status bulb */}
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    healthStatus === 'healthy' ? 'bg-[#00E5FF] shadow-[0_0_8px_#00E5FF] animate-pulse' :
                    healthStatus === 'degraded' ? 'bg-[#FFB300] shadow-[0_0_8px_#FFB300] animate-pulse' :
                    healthStatus === 'offline' ? 'bg-[#FF3366] shadow-[0_0_8px_#FF3366] animate-pulse' :
                    'bg-gray-500 animate-pulse'
                  }`} />
                  <span className="text-[8px] font-black text-white uppercase tracking-wider">
                    {healthStatus === 'loading' ? 'Checking...' : healthStatus.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-2.5 relative z-10">
                <div className="flex flex-col">
                  <span className="text-[7px] font-black text-gray-500 uppercase tracking-wide">Active Engine</span>
                  <span className="text-[10px] font-black text-white uppercase tracking-tight flex items-center gap-1">
                    {activeProvider}
                  </span>
                </div>
                
                {apiLatency !== null && (
                  <div className="flex flex-col items-end">
                    <span className="text-[7px] font-black text-gray-500 uppercase tracking-wide">Latency</span>
                    <span className="text-[10px] font-black text-[#00E5FF]">{apiLatency}ms</span>
                  </div>
                )}
              </div>

              {healthStatus === 'degraded' && activeProvider.includes('OpenRouter') && (
                <div className="flex gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 items-start relative z-10">
                  <ShieldAlert size={12} className="text-[#FFB300] shrink-0 mt-0.5 animate-bounce" />
                  <p className="text-[7px] font-bold text-amber-300 leading-normal uppercase">
                    Rate limits exceeded on OpenRouter! Add GEMINI_API_KEY in .env.local to restore high-speed play.
                  </p>
                </div>
              )}

              {/* Diagnose button */}
              <button
                onClick={checkSystemHealth}
                disabled={checkingHealth}
                className="w-full py-1.5 bg-white/[0.03] border border-white/5 rounded-xl text-[8px] font-black text-white uppercase tracking-widest hover:bg-white/[0.08] active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1 relative z-10"
              >
                {checkingHealth ? (
                  <>
                    <div className="w-2.5 h-2.5 border border-white/30 border-t-white rounded-full animate-spin" />
                    Scanning System...
                  </>
                ) : (
                  'Diagnose Connection'
                )}
              </button>
              
              {/* Subtle back ambient glow */}
              <div className={`absolute -right-6 -bottom-6 w-12 h-12 rounded-full blur-xl opacity-[0.03] pointer-events-none transition-colors duration-500 ${
                healthStatus === 'healthy' ? 'bg-[#00E5FF]' :
                healthStatus === 'degraded' ? 'bg-[#FFB300]' :
                healthStatus === 'offline' ? 'bg-[#FF3366]' :
                'bg-gray-500'
              }`} />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto px-6 custom-scrollbar pb-8 space-y-3">
            {candidates.length === 0 ? (
              <div className="text-center py-10 px-4">
                <div className="w-10 h-10 border-2 border-ipl-gold/30 border-t-ipl-gold rounded-full animate-spin mx-auto mb-4" />
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Scanning Stadium...</p>
              </div>
            ) : (
              candidates.map((cand, idx) => {
                const teamColors = TEAM_BRAND_COLORS[cand.team] || TEAM_BRAND_COLORS.Retired;
                return (
                  <motion.div
                    key={cand.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-3 bg-white/[0.03] border border-white/5 rounded-2xl flex flex-col gap-1.5 hover:bg-white/[0.06] transition-all group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-black text-white uppercase group-hover:text-ipl-gold transition-colors">{cand.name}</h4>
                        <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">{cand.role} • {cand.team}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black" style={{ color: teamColors.primary }}>{cand.probability}%</span>
                      </div>
                    </div>
                    
                    {/* Live probability scale */}
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${cand.probability}%` }}
                        className="h-full"
                        style={{ 
                          backgroundImage: `linear-gradient(to right, ${teamColors.primary}, #FF822A)`,
                          transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' 
                        }}
                      />
                    </div>
                  </motion.div>
                );
              })
            )}
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

// Hook: fetches the verified Wikipedia thumbnail for a guessed player
function useWikipediaImage(playerName: string) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!playerName) return;
    setImgUrl(null);
    const wikiName = playerName.trim().replace(/\s+/g, '_');
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiName)}`)
      .then(r => r.json())
      .then(data => { if (data?.thumbnail?.source) setImgUrl(data.thumbnail.source); })
      .catch(() => {});
  }, [playerName]);
  return imgUrl;
}

function GuessOverlay({ name, confidence, onResult }: { name: string; confidence: number; onResult: (correct: boolean) => void }) {
  const [countdown, setCountdown] = useState(3);
  const showResult = countdown === 0;
  const wikiImage = useWikipediaImage(name);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 800);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const player = allPlayersData.find(p => p.name.toLowerCase() === name.toLowerCase());
  const team = player?.currentTeam || 'Retired';
  const colors = TEAM_BRAND_COLORS[team] || TEAM_BRAND_COLORS.Retired;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#020208]/98 flex flex-col items-center justify-center text-center p-6"
    >
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none transition-all duration-1000 blur-[140px] rounded-full scale-75"
        style={{ backgroundColor: colors.primary }}
      />
      
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
          initial={{ rotateY: 90, scale: 0.8, opacity: 0 }}
          animate={{ rotateY: 0, scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="w-[340px] rounded-[2.5rem] bg-white/[0.02] border border-white/10 backdrop-blur-xl p-6 shadow-2xl relative group overflow-hidden"
          style={{
            boxShadow: `0 20px 50px ${colors.shadow}`
          }}
        >
          {/* Neon Border Glow */}
          <div 
            className="absolute inset-0 opacity-25 border-[3px] rounded-[2.5rem] pointer-events-none"
            style={{ borderColor: colors.primary }}
          />

          {/* Dynamic Image — Wikipedia photo with initials avatar fallback */}
          <div className="w-full h-[280px] rounded-[2rem] overflow-hidden mb-6 relative border border-white/10 bg-black/50">
            <img 
              src={wikiImage || getPlayerImageUrl(name)}
              alt={name}
              className="w-full h-full object-cover object-top filter grayscale group-hover:grayscale-0 transition-all duration-500"
              onError={(e) => { e.currentTarget.src = getPlayerImageUrl(name); }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020208] via-transparent to-transparent" />
            
            {/* Live Confidence Badge */}
            <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-1">
              <span className="text-[8px] font-black text-gray-400">CONFIDENCE:</span>
              <span className="text-xs font-black text-ipl-gold">{confidence}%</span>
            </div>
          </div>

          {/* Player details */}
          <div className="text-center mb-6">
            <div 
              className="text-[9px] font-black uppercase tracking-[0.25em] mb-1"
              style={{ color: colors.primary }}
            >
              {team === 'Retired' ? 'IPL LEGEND' : `${team} SQUAD`}
            </div>
            <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase drop-shadow-md">
              {name}
            </h2>
            <div className="text-[10px] text-gray-500 font-bold mt-1">
              {player?.role || 'Star Player'}
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => onResult(true)}
              className="py-3.5 bg-ipl-gold text-black text-xs font-black rounded-xl hover:shadow-[0_0_20px_rgba(245,166,35,0.4)] active:scale-95 transition-all uppercase italic"
            >
              🎉 Correct
            </button>
            <button 
              onClick={() => onResult(false)}
              className="py-3.5 bg-white/5 border border-white/10 text-xs font-black rounded-xl hover:bg-red-500/15 hover:border-red-500/40 active:scale-95 transition-all uppercase italic"
            >
              ❌ Wrong
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
