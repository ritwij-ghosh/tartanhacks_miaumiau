import React, { useState } from 'react';
import { Send, User, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [showItineraryToggle, setShowItineraryToggle] = useState(false);
  const [itineraryView, setItineraryView] = useState<'present' | 'future'>('present');
  const [message, setMessage] = useState('');

  return (
    <div className="min-h-screen bg-[#F5F1E8] flex flex-col max-w-md mx-auto relative overflow-hidden">
      {/* Subtle paper texture overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative pt-14 pb-6 px-6 border-b border-[#1e2cb2]/10"
      >
        <div className="flex items-start justify-between mb-6">
          {/* Winston Logo/Brand */}
          <div className="flex-1">
            <h1 className="text-2xl text-[#1e2cb2] tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
              Winston
            </h1>
            <div className="mt-1 w-12 h-[2px] bg-[#1e2cb2] opacity-80"
              style={{
                clipPath: 'polygon(0 0, 98% 0, 100% 100%, 2% 100%)',
              }}
            />
          </div>

          {/* Profile Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="w-11 h-11 rounded-full bg-[#6B7B9E]/10 border border-[#6B7B9E]/20 flex items-center justify-center relative overflow-hidden"
            style={{
              boxShadow: '2px 2px 0px rgba(30, 44, 178, 0.1)',
            }}
          >
            <User size={20} className="text-[#1e2cb2]" strokeWidth={1.5} />
            {/* Stamp-like texture */}
            <div className="absolute inset-0 opacity-20 mix-blend-multiply"
              style={{
                background: 'radial-gradient(circle at 30% 30%, transparent 0%, rgba(30, 44, 178, 0.1) 100%)',
              }}
            />
          </motion.button>
        </div>

        {/* Itinerary Button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowItineraryToggle(!showItineraryToggle)}
          className="w-full bg-white/40 backdrop-blur-sm rounded-2xl px-4 py-3 flex items-center justify-between border border-[#1e2cb2]/15 relative overflow-hidden"
          style={{
            boxShadow: showItineraryToggle ? 'inset 0 2px 8px rgba(30, 44, 178, 0.08)' : '0 1px 3px rgba(30, 44, 178, 0.08)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#1e2cb2]/5 flex items-center justify-center">
              <Calendar size={18} className="text-[#1e2cb2]" strokeWidth={1.5} />
            </div>
            <span className="text-[#2B2B2B] text-[15px]" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              Itinerary
            </span>
          </div>
          
          {/* Ink bleed accent */}
          <div className="absolute right-0 top-0 w-16 h-full opacity-5"
            style={{
              background: 'linear-gradient(90deg, transparent, #1e2cb2)',
              filter: 'blur(8px)',
            }}
          />
        </motion.button>

        {/* Itinerary Toggle */}
        <AnimatePresence>
          {showItineraryToggle && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex gap-2 px-1">
                <button
                  onClick={() => setItineraryView('present')}
                  className={`flex-1 py-2.5 rounded-xl text-[14px] transition-all relative overflow-hidden ${
                    itineraryView === 'present'
                      ? 'bg-[#1e2cb2] text-white'
                      : 'bg-white/30 text-[#6B7B9E] border border-[#6B7B9E]/15'
                  }`}
                  style={{ 
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    boxShadow: itineraryView === 'present' ? '2px 3px 0px rgba(30, 44, 178, 0.15)' : 'none',
                  }}
                >
                  Present
                  {itineraryView === 'present' && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-[#1e2cb2]"
                      style={{ borderRadius: '0.75rem', zIndex: -1 }}
                    />
                  )}
                </button>
                <button
                  onClick={() => setItineraryView('future')}
                  className={`flex-1 py-2.5 rounded-xl text-[14px] transition-all relative overflow-hidden ${
                    itineraryView === 'future'
                      ? 'bg-[#1e2cb2] text-white'
                      : 'bg-white/30 text-[#6B7B9E] border border-[#6B7B9E]/15'
                  }`}
                  style={{ 
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    boxShadow: itineraryView === 'future' ? '2px 3px 0px rgba(30, 44, 178, 0.15)' : 'none',
                  }}
                >
                  Future
                  {itineraryView === 'future' && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-[#1e2cb2]"
                      style={{ borderRadius: '0.75rem', zIndex: -1 }}
                    />
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
        {/* Winston's Message */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex gap-3"
        >
          {/* Avatar with stamp aesthetic */}
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#1e2cb2] flex items-center justify-center relative overflow-hidden"
            style={{
              boxShadow: '2px 2px 0px rgba(30, 44, 178, 0.2)',
              transform: 'rotate(-1deg)',
            }}
          >
            <span className="text-white text-[14px]" style={{ fontFamily: 'Georgia, serif' }}>W</span>
            {/* Stamp texture */}
            <div className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `radial-gradient(circle at 60% 40%, rgba(255,255,255,0.3) 0%, transparent 50%)`,
              }}
            />
          </div>

          {/* Message Bubble */}
          <div className="flex-1 max-w-[75%]">
            <div className="bg-white rounded-3xl rounded-tl-md px-5 py-4 relative border border-[#1e2cb2]/10"
              style={{
                boxShadow: '0 2px 8px rgba(30, 44, 178, 0.06)',
              }}
            >
              {/* Ink bleed effect */}
              <div className="absolute -left-1 top-6 w-2 h-8 bg-[#1e2cb2] opacity-5 blur-sm" />
              
              <p className="text-[#2B2B2B] text-[15px] leading-relaxed" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                Good afternoon! I'm Winston, your travel planning assistant.
              </p>
              <p className="text-[#2B2B2B] text-[15px] leading-relaxed mt-3" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                I can help you organize your itinerary, find destinations, and keep track of your journey. Where would you like to travel?
              </p>
              
              <span className="text-[#6B7B9E] text-[12px] mt-3 block" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                2:34 PM
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Message Input Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-6 pt-4 relative"
      >
        {/* Subtle top gradient fade */}
        <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-transparent to-[#F5F1E8] pointer-events-none" />
        
        <div className="relative bg-white rounded-[28px] border border-[#1e2cb2]/15 flex items-center gap-3 px-5 py-3 overflow-hidden"
          style={{
            boxShadow: '0 4px 16px rgba(30, 44, 178, 0.08)',
          }}
        >
          {/* Input */}
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message Winston..."
            className="flex-1 bg-transparent outline-none text-[#2B2B2B] text-[15px] placeholder:text-[#6B7B9E]/50"
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          />

          {/* Send Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="w-9 h-9 rounded-full bg-[#1e2cb2] flex items-center justify-center flex-shrink-0 relative overflow-hidden"
            style={{
              boxShadow: '2px 2px 0px rgba(30, 44, 178, 0.2)',
              transform: 'rotate(1deg)',
            }}
          >
            <Send size={18} className="text-white" strokeWidth={2} style={{ transform: 'translateX(1px)' }} />
            
            {/* Organic texture overlay */}
            <div className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `radial-gradient(circle at 70% 30%, rgba(255,255,255,0.4) 0%, transparent 60%)`,
              }}
            />
          </motion.button>

          {/* Subtle ink bleed accent on right edge */}
          <div className="absolute right-0 top-0 bottom-0 w-20 opacity-5 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent, #1e2cb2)',
              filter: 'blur(10px)',
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}
