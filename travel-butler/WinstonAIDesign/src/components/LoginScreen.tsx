import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { InkDecorations } from './InkDecorations';

export function LoginScreen() {
  const navigate = useNavigate();

  return (
    <div className="washi-texture min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden"
      style={{ background: '#F9F5E3' }}
    >
      {/* SVG filter for ink bleed effect */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id="inkBleedFilter" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" seed="1" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* Decorative ink brush strokes and stamps */}
      <InkDecorations variant="login" />

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="flex flex-col items-center w-full max-w-sm z-10"
        style={{ gap: '3.5rem' }}
      >
        {/* Winston AI Logo/Title - hand-brushed serif impression */}
        <div className="text-center" style={{ gap: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Animated title with brush stroke reveal */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0.3 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ originX: 0.5 }}
          >
            <motion.h1
              className="ink-header"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 700,
                fontSize: '3.5rem',
                letterSpacing: '-0.01em',
                color: '#0D2B45',
                lineHeight: 1.1,
              }}
              animate={{
                textShadow: [
                  '0 0 1px rgba(13,43,69,0.5), 0.5px 0.5px 1.2px rgba(13,43,69,0.2)',
                  '0 0 1.5px rgba(13,43,69,0.6), 0.8px 0.8px 1.5px rgba(13,43,69,0.25)',
                  '0 0 1px rgba(13,43,69,0.5), 0.5px 0.5px 1.2px rgba(13,43,69,0.2)',
                ],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              Winston AI
            </motion.h1>
          </motion.div>

          {/* Decorative ink line beneath title */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: '120px',
              height: '1.5px',
              background: 'rgba(13, 43, 69, 0.3)',
              margin: '0.5rem auto',
              filter: 'url(#inkBleedFilter)',
            }}
          />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="ink-text"
            style={{
              fontFamily: "'Source Sans 3', 'Helvetica Neue', sans-serif",
              color: '#1A3D5C',
              fontWeight: 400,
              fontSize: '0.85rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}
          >
            Travel Butler
          </motion.p>
        </div>

        {/* Action Buttons - solid ink label/card style */}
        <div className="flex flex-col w-full" style={{ gap: '1rem' }}>
          <motion.button
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/dashboard')}
            className="ink-box"
            style={{
              background: '#0D2B45',
              padding: '1.1rem 2rem',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <span
              className="block text-center ink-text"
              style={{
                color: '#F9F5E3',
                fontFamily: "'Source Sans 3', 'Helvetica Neue', sans-serif",
                fontWeight: 600,
                fontSize: '1rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              New User
            </span>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/dashboard')}
            className="ink-box"
            style={{
              background: 'transparent',
              padding: '1.1rem 2rem',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <span
              className="block text-center ink-text"
              style={{
                color: '#0D2B45',
                fontFamily: "'Source Sans 3', 'Helvetica Neue', sans-serif",
                fontWeight: 600,
                fontSize: '1rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Sign In
            </span>
          </motion.button>
        </div>
      </motion.div>

      {/* Bottom decorative element */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.2 }}
        className="absolute bottom-8 text-center ink-text"
        style={{
          color: '#1A3D5C',
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '0.75rem',
          fontWeight: 400,
          fontStyle: 'italic',
          letterSpacing: '0.08em',
        }}
      >
        est. Tokyo · 2026
      </motion.div>
    </div>
  );
}
