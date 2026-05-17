'use client';

import { motion } from 'framer-motion';
import { Play, BrainCircuit, Trophy, Users, HelpCircle, Zap, ShieldAlert, Radio } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Load Three.js 3D Background dynamically to prevent server-side rendering issues
const ThreeBackground = dynamic(() => import('@/components/ThreeBackground'), { ssr: false });

const TEAMS = [
  { name: 'CSK', color: '#FFEA00', text: '#004BA0', border: 'border-yellow-400' },
  { name: 'MI', color: '#004BA0', text: '#FFFFFF', border: 'border-blue-600' },
  { name: 'RCB', color: '#EC1C24', text: '#FFFFFF', border: 'border-red-600' },
  { name: 'KKR', color: '#3A225D', text: '#FFD700', border: 'border-purple-600' },
  { name: 'DC', color: '#134187', text: '#D71920', border: 'border-sky-700' },
  { name: 'PBKS', color: '#D71920', text: '#FFFFFF', border: 'border-red-500' },
  { name: 'RR', color: '#EA1A85', text: '#FFFFFF', border: 'border-pink-500' },
  { name: 'SRH', color: '#FF3C00', text: '#000000', border: 'border-orange-500' },
  { name: 'GT', color: '#0B2240', text: '#B99B5A', border: 'border-slate-800' },
  { name: 'LSG', color: '#0057E7', text: '#E60000', border: 'border-blue-500' },
];

export default function Home() {
  // Animation presets
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 100, damping: 15 },
    },
  };

  return (
    <div className="min-h-screen text-white font-sans overflow-x-hidden flex flex-col items-center justify-center relative p-4 md:p-8">
      {/* 3D WebGL Atmosphere */}
      <ThreeBackground />

      {/* Grid overlay for a high-tech/stadium floodlight net look */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03]" 
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '30px 30px',
        }}
      />

      {/* Top Banner: Stadium Live Info */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-1.5 bg-black/40 backdrop-blur-md border border-white/5 rounded-full shadow-lg">
        <Radio size={12} className="text-red-500 animate-pulse" />
        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 flex items-center gap-1.5">
          Live Broadcast <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
        </span>
      </div>

      <motion.main 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-5xl w-full text-center z-10 py-16 flex flex-col items-center"
      >
        {/* Subtitle Badge */}
        <motion.div variants={itemVariants} className="mb-4">
          <div className="px-4 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-full inline-flex items-center gap-2 shadow-[0_0_15px_rgba(245,166,35,0.15)]">
            <Trophy size={14} className="text-amber-400 animate-bounce" />
            <span className="text-[10px] font-black tracking-[0.25em] text-amber-400 uppercase italic">
              IPL Mind Reader Challenge
            </span>
          </div>
        </motion.div>

        {/* Hero Title */}
        <motion.div variants={itemVariants} className="mb-6">
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter italic leading-none uppercase drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
            IPL <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 drop-shadow-[0_0_20px_rgba(245,166,35,0.3)]">AKINATOR</span> ⚡
          </h1>
        </motion.div>

        {/* Tagline */}
        <motion.p 
          variants={itemVariants} 
          className="text-lg md:text-2xl text-gray-400 max-w-2xl mb-10 font-bold leading-tight"
        >
          Lock a superstar player in your mind... <br />
          Watch as our <span className="text-amber-400 underline decoration-amber-400/40 decoration-2 underline-offset-8">Commentator AI</span> decodes your thoughts in <span className="text-white underline decoration-amber-400 underline-offset-8 font-black">12 questions!</span>
        </motion.p>

        {/* Call to Action */}
        <motion.div variants={itemVariants} className="mb-16">
          <Link href="/game" className="relative group block">
            {/* Pulsing Backglow */}
            <div className="absolute inset-0 bg-amber-500 rounded-[2rem] blur-xl opacity-20 group-hover:opacity-40 group-hover:scale-105 transition-all duration-500" />

            <button className="relative flex items-center gap-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-black px-14 py-6 rounded-[2rem] text-2xl md:text-3xl font-black italic tracking-tight hover:scale-[1.03] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(245,166,35,0.3)] cursor-pointer overflow-hidden border border-amber-300/40">
              <Play className="fill-current w-6 h-6" /> START PLAYING
              
              {/* Shimmer sweep effect */}
              <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:animate-shine" />
            </button>
          </Link>

          {/* Quick Metrics */}
          <div className="flex justify-center gap-6 mt-6 text-gray-500 font-black tracking-widest text-[9px] uppercase">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/[0.02] border border-white/5 rounded-full">
              <Users size={10} className="text-blue-400" /> 80+ PLAYERS
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/[0.02] border border-white/5 rounded-full">
              <HelpCircle size={10} className="text-amber-400" /> 12 QUESTIONS
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/[0.02] border border-white/5 rounded-full">
              <BrainCircuit size={10} className="text-green-500" /> DUAL-AGENT AI
            </div>
          </div>
        </motion.div>

        {/* Bento Grid Features */}
        <motion.div 
          variants={itemVariants}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl text-left px-4"
        >
          {[
            { 
              icon: <BrainCircuit className="text-blue-400" />, 
              title: "1. CHOOSE YOUR CHAMP", 
              desc: "Picture any legendary cricketer from IPL history (2008-2026), active or retired.",
              glow: "group-hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] group-hover:border-blue-500/30"
            },
            { 
              icon: <Zap className="text-amber-400" />, 
              title: "2. ANSWER WITH HONESTY", 
              desc: "Respond to the high-energy commentary queries. The AI adapts to every single move.",
              glow: "group-hover:shadow-[0_0_30px_rgba(245,166,35,0.15)] group-hover:border-amber-500/30"
            },
            { 
              icon: <Trophy className="text-green-400" />, 
              title: "3. WITNESS DEDUCTION", 
              desc: "Watch the Suspect Board dynamically filter probabilities in real-time as we pinpoint your star.",
              glow: "group-hover:shadow-[0_0_30px_rgba(74,222,128,0.15)] group-hover:border-green-500/30"
            }
          ].map((item, i) => (
            <motion.div 
              key={i} 
              whileHover={{ y: -5, scale: 1.01 }}
              className={`group bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] hover:bg-white/[0.04] transition-all duration-300 relative overflow-hidden backdrop-blur-md ${item.glow}`}
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="mb-4 p-3 bg-white/[0.03] w-fit rounded-2xl border border-white/5">{item.icon}</div>
              <h3 className="font-black text-lg mb-2 italic tracking-tight text-white">{item.title}</h3>
              <p className="text-xs text-gray-500 font-bold leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.main>

      {/* Endless Team Ticker */}
      <div className="fixed bottom-0 left-0 w-full overflow-hidden bg-black/40 backdrop-blur-md border-t border-white/5 py-4 z-20">
        <motion.div 
          animate={{ x: [0, -1200] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="flex gap-6 whitespace-nowrap px-6"
        >
          {[...TEAMS, ...TEAMS, ...TEAMS, ...TEAMS].map((team, i) => (
            <div 
              key={i} 
              className={`px-4 py-1.5 rounded-full font-black italic tracking-wider text-xs border ${team.border} uppercase transition-all duration-300`}
              style={{ backgroundColor: `${team.color}15`, color: team.color }}
            >
              • {team.name} SQUAD
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
