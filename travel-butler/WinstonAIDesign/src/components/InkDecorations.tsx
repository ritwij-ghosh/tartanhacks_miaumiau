import { motion } from 'motion/react';

interface InkDecorationsProps {
  variant: 'login' | 'dashboard';
}

export function InkDecorations({ variant }: InkDecorationsProps) {
  if (variant === 'login') {
    return (
      <>
        {/* Top-right brush stroke accent */}
        <motion.div
          initial={{ opacity: 0, pathLength: 0 }}
          animate={{ opacity: 0.12 }}
          transition={{ duration: 1.5, delay: 0.3 }}
          style={{
            position: 'absolute',
            top: '6rem',
            right: '1.5rem',
            width: '80px',
            height: '3px',
            background: 'linear-gradient(90deg, transparent, #0D2B45 20%, #0D2B45 80%, transparent)',
            transform: 'rotate(-8deg)',
            filter: 'blur(0.5px)',
            pointerEvents: 'none',
          }}
        />

        {/* Left vertical brush mark */}
        <motion.div
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 0.08, scaleY: 1 }}
          transition={{ duration: 1.2, delay: 0.5 }}
          style={{
            position: 'absolute',
            top: '30%',
            left: '2rem',
            width: '2px',
            height: '100px',
            background: 'linear-gradient(to bottom, transparent, #0D2B45 20%, #0D2B45 80%, transparent)',
            filter: 'blur(0.3px)',
            pointerEvents: 'none',
          }}
        />

        {/* Ink stamp mark - circle (hanko-style) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: -15 }}
          animate={{ opacity: 0.07, scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          style={{
            position: 'absolute',
            bottom: '10rem',
            right: '2.5rem',
            width: '40px',
            height: '40px',
            border: '2px solid #0D2B45',
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />

        {/* Small dot accents - like ink drops */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          style={{
            position: 'absolute',
            top: '20%',
            right: '4rem',
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: '#0D2B45',
            pointerEvents: 'none',
          }}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.06 }}
          transition={{ duration: 0.6, delay: 1.1 }}
          style={{
            position: 'absolute',
            bottom: '25%',
            left: '3rem',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#0D2B45',
            pointerEvents: 'none',
          }}
        />

        {/* Faint corner bracket marks - like travel stamps */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.06 }}
          transition={{ duration: 1, delay: 0.7 }}
          style={{
            position: 'absolute',
            top: '12%',
            left: '10%',
            width: '20px',
            height: '20px',
            borderTop: '1.5px solid #0D2B45',
            borderLeft: '1.5px solid #0D2B45',
            pointerEvents: 'none',
          }}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.06 }}
          transition={{ duration: 1, delay: 0.8 }}
          style={{
            position: 'absolute',
            bottom: '15%',
            right: '10%',
            width: '20px',
            height: '20px',
            borderBottom: '1.5px solid #0D2B45',
            borderRight: '1.5px solid #0D2B45',
            pointerEvents: 'none',
          }}
        />
      </>
    );
  }

  // Dashboard variant
  return (
    <>
      {/* Top decorative horizontal line */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 0.08, scaleX: 1 }}
        transition={{ duration: 1, delay: 0.2 }}
        style={{
          position: 'absolute',
          top: '3.5rem',
          left: '5%',
          right: '5%',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, #0D2B45 15%, #0D2B45 85%, transparent)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Right edge vertical accent */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.05 }}
        transition={{ duration: 1.2, delay: 0.4 }}
        style={{
          position: 'absolute',
          top: '15%',
          right: '1rem',
          width: '1.5px',
          height: '120px',
          background: 'linear-gradient(to bottom, transparent, #0D2B45 20%, #0D2B45 80%, transparent)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Faint corner mark */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.04 }}
        transition={{ duration: 1, delay: 0.6 }}
        style={{
          position: 'absolute',
          bottom: '20%',
          left: '1.5rem',
          width: '15px',
          height: '15px',
          borderBottom: '1px solid #0D2B45',
          borderLeft: '1px solid #0D2B45',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
    </>
  );
}
