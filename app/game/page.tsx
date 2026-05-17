'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  ShieldAlert,
  HelpCircle
} from 'lucide-react';
import { players as allPlayersData, TEAM_BRAND_COLORS, getPlayerImageUrl } from '@/lib/players';
import confetti from 'canvas-confetti';
import dynamic from 'next/dynamic';

// Load Three.js background dynamically for SSR safety
const ThreeBackground = dynamic(() => import('@/components/ThreeBackground'), { ssr: false });

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
  const [gamePhase, setGamePhase] = useState<GamePhase>('thinking');
  const [topGuess, setTopGuess] = useState<string>('');
  const [reasoning, setReasoning] = useState<string>('');
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [feedbackPlayer, setFeedbackPlayer] = useState('');

  // 3D Card Hover Tilt Ref & State
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    // Smooth angle caps (-12 to 12 deg)
    const factorX = -(y / (rect.height / 2)) * 12;
    const factorY = (x / (rect.width / 2)) * 12;
    setTilt({ x: factorX, y: factorY });
  };

  const handleCardMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

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

  // Dynamic Theme Colors based on the top candidate's team
  const activeTheme = useMemo(() => {
    if (candidates && candidates.length > 0) {
      const topCand = candidates[0];
      return TEAM_BRAND_COLORS[topCand.team] || TEAM_BRAND_COLORS.Retired;
    }
    // Default IPL Gold theme
    return {
      primary: '#f5a623',
      secondary: '#0b0720',
      shadow: 'rgba(245,166,35,0.3)'
    };
  }, [candidates]);

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

  // Initialize Game
  useEffect(() => {
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
      if (questionNumber >= 20) {
        setGamePhase('guessing');
      } else {
        setIsApiLoading(false);
      }
    } finally {
      setIsApiLoading(false);
    }
  };

  const handleResult = (correct: boolean) => {
    if (correct) {
      setGamePhase('correct');
      confetti({
        particleCount: 180,
        spread: 80,
        origin: { y: 0.65 },
        colors: [activeTheme.primary, '#ffffff', '#1e3a8a']
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
      {/* 3D WEBGL ARENA BACKGROUND */}
      <ThreeBackground />

      <AnimatePresence>
        {gamePhase === 'guessing' && (
          <GuessOverlay name={topGuess} confidence={confidence} onResult={handleResult} />
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 h-screen relative z-10">
        
        {/* LEFT PANEL: Glassmorphic Suspect Board */}
        <div className="hidden lg:flex lg:col-span-3 border-r border-white/5 flex-col bg-[#03030a]/65 backdrop-blur-md pt-6">
          
          {/* Intelligence Pool Header */}
          <div className="px-6 mb-4">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.4)] relative overflow-hidden group">
              <h2 className="flex items-center gap-2 text-[9px] font-black text-amber-400 tracking-[0.25em] mb-2 uppercase">
                <Users size={12} className="text-amber-400" /> Suspects Board
              </h2>
              <div className="flex items-baseline gap-2">
                <motion.div 
                  key={candidates.length}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-4xl font-black text-white italic"
                >
                  {candidates.length || allPlayersData.length}
                </motion.div>
                <div className="text-[8px] font-black text-gray-500 uppercase tracking-wider">Remaining Players</div>
              </div>
              <div className="absolute right-3 bottom-3 w-8 h-8 rounded-full border border-white/5 flex items-center justify-center text-gray-600 font-bold text-xs italic bg-white/[0.01]">
                IPL
              </div>
            </div>
          </div>
          
          {/* API SYSTEM HEALTH MONITOR */}
          <div className="px-6 mb-4">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 shadow-sm flex flex-col gap-2.5 relative overflow-hidden">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Activity size={12} className="text-gray-400 animate-pulse" />
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">AI Connection Status</span>
                </div>
                
                {/* Glowing status light */}
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

              <div className="flex items-center justify-between border-t border-white/5 pt-2.5">
                <div className="flex flex-col">
                  <span className="text-[7px] font-black text-gray-500 uppercase tracking-wide">Active Engine</span>
                  <span className="text-[9px] font-black text-white uppercase tracking-tight">
                    {activeProvider}
                  </span>
                </div>
                
                {apiLatency !== null && (
                  <div className="flex flex-col items-end">
                    <span className="text-[7px] font-black text-gray-500 uppercase tracking-wide">Latency</span>
                    <span className="text-[9px] font-black text-[#00E5FF]">{apiLatency}ms</span>
                  </div>
                )}
              </div>

              {healthStatus === 'degraded' && activeProvider.includes('OpenRouter') && (
                <div className="flex gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 items-start">
                  <ShieldAlert size={12} className="text-[#FFB300] shrink-0 mt-0.5" />
                  <p className="text-[7px] font-bold text-amber-300 leading-normal uppercase">
                    Rate limits exceeded on OpenRouter! Add GEMINI_API_KEY in .env.local for high-speed play.
                  </p>
                </div>
              )}

              {/* Diagnose button */}
              <button
                onClick={checkSystemHealth}
                disabled={checkingHealth}
                className="w-full py-1.5 bg-white/[0.03] border border-white/5 rounded-xl text-[8px] font-black text-white uppercase tracking-widest hover:bg-white/[0.08] active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1 cursor-pointer"
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
            </div>
          </div>
          
          {/* Scrollable list with glow effects */}
          <div className="flex-1 overflow-y-auto px-6 custom-scrollbar pb-8 space-y-3">
            {candidates.length === 0 ? (
              <div className="text-center py-12 px-4 flex flex-col items-center justify-center h-full opacity-60">
                <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mb-4" />
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Assembling Stadium susp...</p>
              </div>
            ) : (
              candidates.map((cand, idx) => {
                const teamColors = TEAM_BRAND_COLORS[cand.team] || TEAM_BRAND_COLORS.Retired;
                return (
                  <motion.div
                    key={cand.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col gap-2 hover:bg-white/[0.05] hover:border-white/10 hover:shadow-lg transition-all group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-black text-white uppercase group-hover:text-amber-400 transition-colors tracking-tight">
                          {cand.name}
                        </h4>
                        <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">
                          {cand.role} • {cand.team}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black italic" style={{ color: teamColors.primary }}>
                          {cand.probability}%
                        </span>
                      </div>
                    </div>
                    
                    {/* Live probability scale */}
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${cand.probability}%` }}
                        className="h-full rounded-full"
                        style={{ 
                          backgroundImage: `linear-gradient(to right, ${teamColors.primary}, #ff6a00)`,
                          boxShadow: `0 0 10px ${teamColors.shadow}`,
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

        {/* CENTER PANEL: Holographic Question Device */}
        <div className="col-span-1 lg:col-span-6 flex flex-col items-center justify-between py-12 px-4 md:px-8 relative">
          
          {/* Header Branding */}
          <div className="text-center z-10 mb-4">
            <motion.h1 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-2xl md:text-4xl font-black tracking-tighter text-white uppercase italic leading-none drop-shadow-md"
            >
              IPL <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 drop-shadow-[0_0_15px_rgba(245,166,35,0.2)]">AKINATOR</span>
            </motion.h1>
            <div className="text-[8px] font-black tracking-[0.3em] text-gray-500 uppercase mt-1">Commentator AI Arena</div>
          </div>

          {/* Interactive 3D Card Container */}
          <div className="w-full max-w-xl flex-1 flex items-center justify-center z-10">
            {gamePhase === 'correct' ? (
              <ResultScreen 
                type="correct" 
                qCount={history.length} 
                confidence={confidence} 
                onRestart={restartGame} 
                player={topGuess}
                themeColor={activeTheme.primary}
              />
            ) : gamePhase === 'wrong' ? (
              <ResultScreen 
                type="wrong" 
                feedback={feedbackPlayer} 
                setFeedback={setFeedbackPlayer} 
                onSubmit={submitFeedback} 
                onRestart={restartGame} 
                themeColor={activeTheme.primary}
              />
            ) : (
              <motion.div
                ref={cardRef}
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                key={questionNumber}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                style={{
                  transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                  transformStyle: 'preserve-3d',
                  boxShadow: `0 25px 60px ${activeTheme.shadow}`,
                  border: `1px solid ${activeTheme.primary}30`
                }}
                className="bg-black/60 backdrop-blur-2xl rounded-[3rem] p-8 md:p-10 shadow-2xl relative overflow-hidden group w-full max-w-lg transition-shadow duration-500"
              >
                {/* Glowing neon halo in background */}
                <div 
                  className="absolute -right-24 -top-24 w-48 h-48 rounded-full blur-[100px] opacity-20 pointer-events-none transition-colors duration-700"
                  style={{ backgroundColor: activeTheme.primary }}
                />
                
                {/* Metallic outline on top */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                
                <div className="flex flex-col items-center" style={{ transform: 'translateZ(40px)' }}>
                  
                  {/* Question Counter Badge */}
                  <div 
                    className="mb-6 flex items-center gap-2 px-4 py-1.5 bg-white/[0.03] rounded-full border transition-colors duration-500"
                    style={{ borderColor: `${activeTheme.primary}40` }}
                  >
                    <BrainCircuit size={14} style={{ color: activeTheme.primary }} className="animate-pulse" />
                    <span className="text-[9px] font-black tracking-widest text-gray-400 uppercase">
                      QUESTION {questionNumber} OF 12
                    </span>
                  </div>

                  {/* Main Commentator Question Box */}
                  <h2 className="text-lg md:text-2xl font-black text-center mb-8 leading-tight min-h-24 flex items-center justify-center text-white italic uppercase drop-shadow-md">
                    {isApiLoading ? (
                      <span className="flex gap-2.5">
                        <span className="w-3.5 h-3.5 bg-amber-400 rounded-full animate-bounce [animation-duration:0.8s]" />
                        <span className="w-3.5 h-3.5 bg-amber-400 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.2s]" />
                        <span className="w-3.5 h-3.5 bg-amber-400 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.4s]" />
                      </span>
                    ) : (
                      currentQuestion?.question
                    )}
                  </h2>

                  {/* Choices Grid */}
                  <div className="grid grid-cols-2 gap-4 w-full" style={{ transform: 'translateZ(20px)' }}>
                    {[
                      { label: 'YES', val: 'yes', icon: '✅', color: 'hover:bg-green-500/25 hover:border-green-500/50 shadow-green-500/5' },
                      { label: 'NO', val: 'no', icon: '❌', color: 'hover:bg-red-500/25 hover:border-red-500/50 shadow-red-500/5' },
                      { label: 'MAYBE', val: 'maybe', icon: '🤷', color: 'hover:bg-yellow-500/25 hover:border-yellow-500/50 shadow-yellow-500/5' },
                      { label: 'DON\'T KNOW', val: 'dont_know', icon: '❓', color: 'hover:bg-blue-500/25 hover:border-blue-500/50 shadow-blue-500/5' },
                    ].map((btn) => (
                      <button
                        key={btn.val}
                        onClick={() => handleAnswer(btn.val as 'yes' | 'no' | 'maybe' | 'dont_know')}
                        disabled={isApiLoading}
                        className={`group relative py-4 bg-white/[0.02] border border-white/5 rounded-2xl font-black text-sm transition-all active:scale-95 disabled:opacity-50 overflow-hidden cursor-pointer shadow-lg flex items-center justify-center gap-2 ${btn.color}`}
                      >
                        {/* Shimmer on hover */}
                        <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 -translate-x-full group-hover:translate-x-[200%] transition-transform duration-1000" />
                        <span className="opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all">{btn.icon}</span>
                        <span className="tracking-tight italic">{btn.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Quick instructions / Help */}
          <div className="text-[8px] font-black tracking-[0.25em] text-gray-600 uppercase z-10 flex items-center gap-1">
            <HelpCircle size={10} /> Lock a player in your mind. The AI adapts live.
          </div>
        </div>

        {/* RIGHT PANEL: Liquid Confidence Reactor */}
        <div className="hidden lg:flex lg:col-span-3 border-l border-white/5 flex-col bg-[#03030a]/65 backdrop-blur-md pt-6">
          <div className="px-8 flex-1 flex flex-col items-center justify-between pb-8">
            <h2 className="flex items-center gap-2 text-[9px] font-black text-amber-400 tracking-[0.25em] mb-4 uppercase">
              <Target size={12} className="text-amber-400" /> AI Reactor
            </h2>

            {/* Glowing Liquid column */}
            <div className="flex-1 w-full max-w-[50px] flex flex-col items-center justify-center py-6 h-full max-h-[340px]">
              <div className="relative h-full w-full bg-white/[0.02] rounded-full border border-white/5 p-1.5 flex flex-col justify-end overflow-hidden shadow-2xl">
                {/* Flowing liquid */}
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${confidence}%` }}
                  transition={{ type: 'spring', stiffness: 40, damping: 18 }}
                  className="w-full rounded-full bg-gradient-to-t relative overflow-hidden"
                  style={{
                    backgroundImage: `linear-gradient(to top, #ff3c00, ${activeTheme.primary}, #fffb00)`,
                    boxShadow: `0 0 25px ${activeTheme.shadow}`
                  }}
                >
                  {/* Floating bubble sparks */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(255,255,255,0.4)_10%,transparent_80%)] animate-pulse" />
                </motion.div>
                
                {/* Horizontal Tick marks */}
                <div className="absolute inset-x-0 inset-y-8 flex flex-col justify-between pointer-events-none opacity-10 text-[8px] font-black text-white px-2">
                  <span>90%</span>
                  <span>70%</span>
                  <span>50%</span>
                  <span>30%</span>
                  <span>10%</span>
                </div>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-lg font-black text-white mix-blend-difference rotate-[-90deg] italic tracking-tighter">
                    {confidence}%
                  </div>
                </div>
              </div>
              <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-3">Confidence</div>
            </div>

            {/* AI Status / Reasoning */}
            <div className="w-full space-y-4">
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                <div className="text-[8px] font-black text-gray-500 mb-2 uppercase tracking-widest flex items-center gap-1.5">
                  <BrainCircuit size={10} className="text-amber-400 animate-bounce" /> Commentator Log
                </div>
                <div className="text-[10px] font-bold leading-relaxed italic text-gray-300 min-h-12 flex items-center">
                  {isApiLoading ? "Processing moves..." : reasoning || "Awaiting your selection..."}
                </div>
              </div>

              {/* Logs */}
              {history.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest px-2">Q&A History</div>
                  {history.slice(-2).map((item, i) => (
                    <div key={i} className="flex justify-between items-center bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2 text-[8px] hover:bg-white/[0.04] transition-colors">
                      <span className="text-gray-500 truncate max-w-[120px] font-bold">{item.question}</span>
                      <span 
                        className="font-black italic uppercase text-[9px] px-1.5 py-0.5 rounded bg-white/[0.02] border border-white/5"
                        style={{ color: item.answer === 'yes' ? '#4ade80' : item.answer === 'no' ? '#f87171' : '#fbbf24' }}
                      >
                        {item.answer.replace('_', ' ')}
                      </span>
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

// Hook: Wikipedia thumbnail getter
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

// 3D Trading Card Guess Overlay
function GuessOverlay({ name, confidence, onResult }: { name: string; confidence: number; onResult: (correct: boolean) => void }) {
  const [countdown, setCountdown] = useState(3);
  const showResult = countdown === 0;
  const wikiImage = useWikipediaImage(name);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 750);
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
      className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center text-center p-4 backdrop-blur-md overflow-hidden"
    >
      {/* Background neon burst */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none transition-all duration-1000 blur-[150px] rounded-full scale-75"
        style={{ backgroundColor: colors.primary }}
      />
      
      {!showResult ? (
        <motion.div
          key={countdown}
          initial={{ scale: 0.3, opacity: 0, rotate: -45 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 2, opacity: 0, rotate: 45 }}
          transition={{ type: 'spring', stiffness: 120, damping: 10 }}
          className="text-[12rem] font-black italic tracking-tighter"
          style={{ color: colors.primary, textShadow: `0 0 40px ${colors.shadow}` }}
        >
          {countdown}
        </motion.div>
      ) : (
        <motion.div
          initial={{ rotateY: 90, z: -100, scale: 0.8, opacity: 0 }}
          animate={{ rotateY: 0, z: 0, scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 80 }}
          className="w-[350px] md:w-[380px] rounded-[2.5rem] bg-black/60 border border-white/10 backdrop-blur-2xl p-6 shadow-2xl relative group overflow-hidden"
          style={{
            boxShadow: `0 30px 60px ${colors.shadow}`,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Glowing trading card framing */}
          <div 
            className="absolute inset-0 opacity-40 border-[2px] rounded-[2.5rem] pointer-events-none"
            style={{ borderColor: colors.primary }}
          />

          {/* Premium Wikipedia photo framing */}
          <div className="w-full h-[280px] rounded-[2rem] overflow-hidden mb-6 relative border border-white/10 bg-black/70 shadow-inner">
            <img 
              src={wikiImage || getPlayerImageUrl(name)}
              alt={name}
              className="w-full h-full object-cover object-top filter contrast-[1.05] brightness-[0.9] group-hover:scale-105 transition-transform duration-700"
              onError={(e) => { e.currentTarget.src = getPlayerImageUrl(name); }}
            />
            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
            
            {/* Confidence Badge */}
            <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/75 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-1.5 shadow-md">
              <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest">CONFIDENCE:</span>
              <span className="text-xs font-black" style={{ color: colors.primary }}>{confidence}%</span>
            </div>

            {/* Team Crest Tag */}
            <div 
              className="absolute bottom-4 left-4 px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-wider border shadow-md"
              style={{ backgroundColor: `${colors.primary}20`, borderColor: colors.primary, color: colors.primary }}
            >
              {team}
            </div>
          </div>

          {/* Player details */}
          <div className="text-center mb-6" style={{ transform: 'translateZ(30px)' }}>
            <div 
              className="text-[9px] font-black uppercase tracking-[0.3em] mb-1 italic"
              style={{ color: colors.primary }}
            >
              {team === 'Retired' ? 'IPL LEGENDARY SQUAD' : `ACTIVE 2026 ROSTER`}
            </div>
            <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase drop-shadow-lg">
              {name}
            </h2>
            <div className="text-[10px] text-gray-400 font-bold mt-1 tracking-wider uppercase">
              {player?.role || 'Cracking Champion'}
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3" style={{ transform: 'translateZ(20px)' }}>
            <button 
              onClick={() => onResult(true)}
              className="py-4 bg-gradient-to-r from-amber-400 to-amber-600 text-black text-xs font-black rounded-xl hover:shadow-[0_0_20px_rgba(245,166,35,0.4)] active:scale-95 transition-all uppercase italic cursor-pointer tracking-wider"
            >
              🎉 CORRECT
            </button>
            <button 
              onClick={() => onResult(false)}
              className="py-4 bg-white/[0.03] border border-white/10 text-xs font-black rounded-xl hover:bg-red-500/15 hover:border-red-500/40 active:scale-95 transition-all uppercase italic cursor-pointer tracking-wider"
            >
              ❌ WRONG
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
  themeColor?: string;
}

function ResultScreen({ type, qCount, confidence, onRestart, player, feedback, setFeedback, onSubmit, themeColor = '#f5a623' }: ResultScreenProps) {
  if (type === 'correct') {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center"
      >
        <div 
          className="w-32 h-32 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 rotate-6 shadow-2xl relative overflow-hidden border border-white/15"
          style={{ 
            backgroundImage: `linear-gradient(135deg, ${themeColor} 0%, #000000 100%)`,
            boxShadow: `0 15px 35px ${themeColor}20` 
          }}
        >
          <Trophy size={60} className="text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)] animate-bounce" />
        </div>
        
        <h2 className="text-4xl md:text-6xl font-black tracking-tighter italic mb-4 uppercase text-white drop-shadow-md">
          BOWLED &apos;EM OUT! 🏏
        </h2>
        
        <p className="text-lg md:text-xl text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
          The AI has cracked your thoughts! You were indeed thinking of <span className="font-black uppercase text-white drop-shadow-md" style={{ color: themeColor }}>{player || "the superstar"}</span>.
        </p>
        
        <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto mb-8">
          <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5">
            <div className="text-2xl font-black text-amber-400 italic">{qCount}</div>
            <div className="text-[9px] font-black text-gray-500 uppercase tracking-wider">QUESTIONS</div>
          </div>
          <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5">
            <div className="text-2xl font-black italic" style={{ color: themeColor }}>{confidence}%</div>
            <div className="text-[9px] font-black text-gray-500 uppercase tracking-wider">CONFIDENCE</div>
          </div>
        </div>

        <button 
          onClick={onRestart}
          className="px-10 py-4 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 text-black font-black rounded-2xl text-xl hover:shadow-[0_0_30px_rgba(245,166,35,0.4)] transition-all flex items-center gap-2 mx-auto cursor-pointer italic"
        >
          <RefreshCcw size={20} /> PLAY AGAIN
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
      <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-500/20 shadow-lg">
        <Flame size={40} className="text-red-500 animate-pulse" />
      </div>
      
      <h2 className="text-3xl md:text-4xl font-black tracking-tighter italic mb-4 uppercase text-white drop-shadow-md">
        DEFEATED?! IMPOSSIBLE! 😤
      </h2>
      
      <p className="text-gray-400 mb-8 font-bold leading-relaxed text-sm max-w-sm mx-auto">
        My sports models were outpaced! Support my AI memory: who was your secret player?
      </p>
      
      <div className="relative mb-6">
        <input 
          type="text" 
          value={feedback}
          onChange={(e) => setFeedback?.(e.target.value)}
          placeholder="ENTER PLAYER NAME"
          className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-lg font-black placeholder:text-gray-700 text-white uppercase focus:outline-none focus:border-amber-400 focus:shadow-[0_0_15px_rgba(245,166,35,0.15)] transition-all"
        />
        <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-700 w-5 h-5" />
      </div>

      <button 
        onClick={() => onSubmit?.()}
        className="w-full py-4 bg-gradient-to-r from-amber-400 to-amber-600 text-black font-black rounded-2xl text-lg mb-3 hover:shadow-[0_0_25px_rgba(245,166,35,0.3)] transition-all cursor-pointer italic"
      >
        SUBMIT & RESTART
      </button>

      <button 
        onClick={onRestart}
        className="w-full py-3.5 bg-white/[0.02] border border-white/5 font-black rounded-2xl text-gray-500 hover:text-white hover:bg-white/[0.04] transition-all cursor-pointer text-sm"
      >
        JUST RESET GAME
      </button>
    </motion.div>
  );
}
