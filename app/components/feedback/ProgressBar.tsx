"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  progress: number; // 0 to 100
  className?: string;
  fillClassName?: string;
  trackClassName?: string;
}

export function ProgressBar({ 
  progress, 
  className = '', 
  fillClassName = 'bg-blu',
  trackClassName = 'bg-[#f1f1f1]'
}: ProgressBarProps) {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className={`w-full h-2 ${trackClassName} rounded-full overflow-hidden ${className}`}>
      <motion.div
        className={`h-full ${fillClassName} rounded-full`}
        initial={{ width: 0 }}
        animate={{ width: `${clampedProgress}%` }}
        transition={{ type: 'spring', stiffness: 50, damping: 15 }}
      />
    </div>
  );
}
