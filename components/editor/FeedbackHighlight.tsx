'use client';

import { motion } from 'framer-motion';

interface FeedbackHighlightProps {
  children: React.ReactNode;
  badgeNumber?: number;
  isCompleted?: boolean;
  onClick?: () => void;
}

export function FeedbackHighlight({
  children,
  badgeNumber,
  isCompleted = false,
  onClick,
}: FeedbackHighlightProps) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25,
      }}
      className={`feedback-highlight ${isCompleted ? 'completed' : ''} inline-block relative`}
      onClick={onClick}
    >
      {children}
      {badgeNumber && (
        <span className="absolute -top-2 -right-2 bg-feedback text-feedback-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
          {badgeNumber}
        </span>
      )}
    </motion.span>
  );
}
