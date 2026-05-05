"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface LoadingBarProps {
  className?: string;
  fillClassName?: string;
  trackClassName?: string;
}

export function LoadingBar({
  className = '',
  fillClassName = '#0000f4',
  trackClassName = '#ffffff'
}: LoadingBarProps) {
  return (
    <div className={`w-full h-2 ${trackClassName} rounded-full overflow-hidden flex items-center ${className}`}>
      <motion.div
        className={`h-full ${fillClassName} rounded-full`}
        style={{ width: '30%' }}
        animate={{
          x: ['-100%', '333%'] // Moves from completely off the left to completely off the right
        }}
        transition={{
          repeat: Infinity,
          ease: "easeInOut",
          duration: 1.5
        }}
      />
    </div>
  );
}
