'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface FeedbackPopoverProps {
  isOpen: boolean;
  position: { x: number; y: number };
  selectedText: string;
  onSubmit: (comment: string) => void;
  onCancel: () => void;
}

export function FeedbackPopover({
  isOpen,
  position,
  selectedText,
  onSubmit,
  onCancel,
}: FeedbackPopoverProps) {
  const [comment, setComment] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  function handleSubmit() {
    if (comment.trim()) {
      onSubmit(comment);
      setComment('');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop to capture clicks outside */}
          <div
            className="fixed inset-0 z-40"
            onClick={onCancel}
          />

          {/* Popover */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20,
            }}
            className="fixed z-50 w-80 bg-background border-2 border-feedback rounded-lg shadow-2xl"
            style={{
              left: Math.min(position.x, window.innerWidth - 330),
              top: Math.min(position.y, window.innerHeight - 250),
            }}
          >
            {/* Selected text preview */}
            <div className="p-3 border-b border-border bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Selected text:</p>
              <p className="text-sm italic text-foreground line-clamp-2">
                "{selectedText}"
              </p>
            </div>

            {/* Comment input */}
            <div className="p-3">
              <textarea
                ref={textareaRef}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe how to improve this..."
                className="w-full h-24 px-3 py-2 border border-input rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>

            {/* Actions */}
            <div className="p-3 border-t border-border flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                variant="accent"
                size="sm"
                onClick={handleSubmit}
                disabled={!comment.trim()}
              >
                Add Feedback
              </Button>
            </div>

            {/* Keyboard hint */}
            <div className="px-3 pb-2 text-xs text-muted-foreground text-center">
              Press Cmd+Enter to submit, Esc to cancel
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
