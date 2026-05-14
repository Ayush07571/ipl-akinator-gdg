'use client';
// Deployment trigger: 2026-05-14-V2

import { motion } from 'framer-motion';
import { Play, BrainCircuit, Trophy, Users, HelpCircle, Zap } from 'lucide-react';
import Link from 'next/link';

const TEAMS = [
  { name: 'CSK', color: '#FFFF00', text: '#000000' },
  { name: 'MI', color: '#004BA0', text: '#FFFFFF' },
  { name: 'RCB', color: '#EC1C24', text: '#FFFFFF' },
  { name: 'KKR', color: '#3A225D', text: '#FFFFFF' },
  { name: 'DC', color: '#00008B', text: '#FFFFFF' },
  { name: 'PBKS', color: '#ED1B24', text: '#FFFFFF' },
  { name: 'RR', color: '#FF69B4', text: '#FFFFFF' },
  { name: 'SRH', color: '#FF822A', text: '#FFFFFF' },
  { name: 'GT', color: '#1B2133', text: '#FFFFFF' },
  { name: 'LSG', color: '#0057E7', text: '#FFFFFF' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-ipl-bg text-white font-sans overflow-hidden flex flex-col items-center justify-center relative p-6">
      
      {/* Animated Bouncing Cricket Ball */}
      <motion.div
        animate={{ 
          y: [0, -400, 0],
          rotate: 360,
          scale: [1, 0.9, 1]
        }}
        transition={{ 
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none"
      >
        <div className="w-[600px] h-[600px] border-[20px] border-red-800 rounded-full flex items-center justify-center">
          <div className="w-full h-1 bg-white/20 absolute top-1/2 -translate-y-1/2" />
        </div>
      </motion.div>

      <main className="max-w-4xl w-full text-center z-10">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="mb-6 flex justify-center">
            <div className="px-4 py-2 bg-ipl-gold/10 border border-ipl-gold/30 rounded-full flex items-center gap-2">
              <Trophy size={16} className="text-ipl-gold" />
              <span className="text-xs font-black tracking-widest text-ipl-gold uppercase italic">The Ultimate Challenge</span>
            </div>
          </div>

          <h1 className="text-6xl md:text-9xl font-black mb-6 tracking-tighter italic">
            IPL <span className="text-transparent bg-clip-text bg-linear-to-r from-ipl-gold via-orange-400 to-ipl-gold">AKINATOR</span> 🏏
          </h1>

          <p className="text-xl md:text-3xl text-gray-400 mb-12 font-bold leading-tight">
            Think of any IPL player... <br className="hidden md:block" />
            I&apos;ll read your mind in <span className="text-white underline decoration-ipl-gold underline-offset-8">12 questions!</span>
          </p>

          <div className="flex flex-col items-center gap-8 mb-20">
            <Link href="/game">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{ 
                  boxShadow: ["0 0 0px rgba(245,166,35,0)", "0 0 40px rgba(245,166,35,0.4)", "0 0 0px rgba(245,166,35,0)"]
                }}
                transition={{ 
                  boxShadow: { duration: 2, repeat: Infinity }
                }}
                className="group relative flex items-center gap-4 bg-ipl-gold text-ipl-bg px-12 py-6 rounded-3xl text-3xl font-black italic transition-all"
              >
                <Play className="fill-current" /> START GAME
              </motion.button>
            </Link>

            <div className="flex gap-8 text-gray-500 font-black tracking-widest text-xs uppercase">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-ipl-accent" /> 80+ PLAYERS
              </div>
              <div className="flex items-center gap-2">
                <HelpCircle size={14} className="text-ipl-gold" /> 12 QUESTIONS
              </div>
              <div className="flex items-center gap-2">
                <BrainCircuit size={14} className="text-green-500" /> AI-POWERED
              </div>
            </div>
          </div>
        </motion.div>

        {/* How it works */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left"
        >
          {[
            { 
              icon: <BrainCircuit className="text-ipl-accent" />, 
              title: "THINK", 
              desc: "Think of any IPL player (past or present) from our 80+ legend pool." 
            },
            { 
              icon: <Zap className="text-ipl-gold" />, 
              title: "ANSWER", 
              desc: "Respond to the AI's dramatic commentator-style questions honestly." 
            },
            { 
              icon: <Trophy className="text-green-500" />, 
              title: "GUESS", 
              desc: "Watch as the AI filters 80 players down to your target in record time!" 
            }
          ].map((item, i) => (
            <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] hover:bg-white/[0.07] transition-colors">
              <div className="mb-4">{item.icon}</div>
              <h3 className="font-black text-xl mb-2 italic tracking-tight">{item.title}</h3>
              <p className="text-sm text-gray-500 font-bold leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>

      {/* Team Logos Ticker */}
      <div className="fixed bottom-0 left-0 w-full overflow-hidden bg-ipl-card border-t border-white/5 py-4">
        <motion.div 
          animate={{ x: [0, -1000] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="flex gap-8 whitespace-nowrap px-8"
        >
          {[...TEAMS, ...TEAMS, ...TEAMS].map((team, i) => (
            <div 
              key={i} 
              className="px-4 py-1 rounded-md font-black italic tracking-tighter text-sm"
              style={{ backgroundColor: team.color, color: team.text }}
            >
              {team.name}
            </div>
          ))}
        </motion.div>
      </div>

      {/* Background Decorative Elements */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-ipl-accent blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-ipl-gold blur-[120px] rounded-full" />
      </div>
    </div>
  );
}
