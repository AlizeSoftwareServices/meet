'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface MeetLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'brand' | 'dots' | 'inline';
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

export function MeetLoader({
  size = 'md',
  variant = 'brand',
  text,
  fullScreen = false,
  className = '',
}: MeetLoaderProps) {
  // Dimensions map
  const sizeMap = {
    sm: { icon: 28, dot: 6, font: 'text-xs' },
    md: { icon: 54, dot: 10, font: 'text-sm' },
    lg: { icon: 80, dot: 14, font: 'text-base' },
    xl: { icon: 110, dot: 18, font: 'text-lg' },
  };

  const currentSize = sizeMap[size];

  // 1. "dots" / "morph" variant: Sleek Calendly-like 3-capsule sync wave with Meet's gradient colors
  if (variant === 'dots') {
    const loaderContent = (
      <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-sm"
              animate={{
                scale: [1, 1.4, 0.9, 1],
                width: [currentSize.dot, currentSize.dot * 2.2, currentSize.dot, currentSize.dot],
                opacity: [0.6, 1, 0.6, 0.6],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
              style={{
                height: currentSize.dot,
                minWidth: currentSize.dot,
              }}
            />
          ))}
        </div>
        {text && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`font-medium text-muted-foreground ${currentSize.font} tracking-wide`}
          >
            {text}
          </motion.p>
        )}
      </div>
    );

    if (fullScreen) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
          {loaderContent}
        </div>
      );
    }
    return loaderContent;
  }

  // 2. "inline" variant for buttons & tight spaces
  if (variant === 'inline') {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary"
        />
        {text && <span className="text-xs font-medium">{text}</span>}
      </div>
    );
  }

  // 3. "brand" variant (Signature Meet scheduling loader):
  // Calendar card with glowing gradient rings and animated meeting video/clock pulse
  const brandContent = (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <div className="relative flex items-center justify-center" style={{ width: currentSize.icon, height: currentSize.icon }}>
        {/* Ambient radial glow */}
        <motion.div
          className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-500/20 via-indigo-500/30 to-purple-500/20 blur-xl"
          animate={{
            scale: [0.9, 1.25, 0.9],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Outer Calendar Glass Frame */}
        <div 
          className="relative w-full h-full rounded-2xl bg-gradient-to-br from-white/90 via-slate-50/90 to-blue-50/80 dark:from-slate-900/90 dark:via-slate-800/90 dark:to-blue-950/80 border border-blue-500/30 shadow-lg shadow-blue-500/10 flex flex-col items-center overflow-hidden"
        >
          {/* Top binder rings */}
          <div className="w-full h-[22%] bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-around px-2">
            <span className="w-1.5 h-2 rounded-full bg-white/90 shadow-xs" />
            <span className="w-1.5 h-2 rounded-full bg-white/90 shadow-xs" />
          </div>

          {/* Central Animated Meeting & Clock Nodes */}
          <div className="flex-1 w-full flex items-center justify-center relative">
            {/* Clock Hand / Radar Sweep */}
            <motion.div
              className="absolute w-2/3 h-2/3 rounded-full border border-dashed border-blue-400/30 dark:border-blue-400/20"
              animate={{ rotate: 360 }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
            />

            {/* Central Video/Meet Pulse Badge */}
            <motion.div
              className="w-1/2 h-1/2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30"
              animate={{
                scale: [0.9, 1.08, 0.9],
              }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              {/* Video Camera Icon Graphic */}
              <svg 
                className="w-1/2 h-1/2 fill-current" 
                viewBox="0 0 24 24"
              >
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
              </svg>
            </motion.div>

            {/* Orbiting Sync Node: Host & Guest */}
            <motion.div
              className="absolute w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: 'linear',
              }}
              style={{
                transformOrigin: '50% 170%',
              }}
            />
          </div>
        </div>
      </div>

      {/* Morphing Meeting Slots Indicator (like Calendly's 3-pill rhythm underneath) */}
      <div className="flex items-center gap-1.5 mt-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="rounded-full bg-primary/70"
            animate={{
              scale: [1, 1.35, 1],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              delay: i * 0.18,
              ease: 'easeInOut',
            }}
            style={{ width: currentSize.dot * 0.8, height: currentSize.dot * 0.8 }}
          />
        ))}
      </div>

      {text && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`font-semibold text-foreground/80 ${currentSize.font} tracking-wide text-center`}
        >
          {text}
        </motion.p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
        {brandContent}
      </div>
    );
  }

  return brandContent;
}

export default MeetLoader;
