import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

interface SplashAnimationProps {
  onComplete: () => void;
}

export function SplashAnimation({ onComplete }: SplashAnimationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center washi-texture"
      style={{
        background: '#F9F5E3',
      }}
    >
      {/* SVG filter for ink bleed */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id="splashInkBleed" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" seed="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.2" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center"
        style={{ gap: '1rem' }}
      >
        <motion.h1
          className="ink-header"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: 700,
            fontSize: '4.5rem',
            letterSpacing: '-0.01em',
            color: '#0D2B45',
            lineHeight: 1,
          }}
          animate={{
            textShadow: [
              '0 0 1px rgba(13,43,69,0.5), 0.5px 0.5px 1.2px rgba(13,43,69,0.2)',
              '0 0 2px rgba(13,43,69,0.6), 1px 1px 2px rgba(13,43,69,0.25)',
              '0 0 1px rgba(13,43,69,0.5), 0.5px 0.5px 1.2px rgba(13,43,69,0.2)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          Winston AI
        </motion.h1>

        {/* Ink line expanding beneath */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{
            width: '80px',
            height: '1.5px',
            background: 'rgba(13, 43, 69, 0.35)',
            filter: 'url(#splashInkBleed)',
          }}
        />
      </motion.div>

      {/* Subtle ink drop animation - top right */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 0.08, scale: 1 }}
        transition={{ duration: 1, delay: 0.6, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          top: '25%',
          right: '20%',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#0D2B45',
        }}
      />

      {/* Subtle ink drop - bottom left */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 0.06, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.8, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          bottom: '30%',
          left: '25%',
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          background: '#0D2B45',
        }}
      />
    </motion.div>
  );
}
