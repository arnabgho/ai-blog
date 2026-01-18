'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { FeedbackPopover } from './FeedbackPopover';
import { FeedbackHighlight } from './FeedbackHighlight';
import type { FeedbackItem } from '@/lib/types';

interface PreviewPaneProps {
  content: string;
  feedbackMode: boolean;
  feedbackItems: FeedbackItem[];
  onAddFeedback: (feedback: FeedbackItem) => void;
  className?: string;
}

interface Selection {
  text: string;
  startOffset: number;
  endOffset: number;
  position: { x: number; y: number };
}

export function PreviewPane({
  content,
  feedbackMode,
  feedbackItems,
  onAddFeedback,
  className = '',
}: PreviewPaneProps) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [showPopover, setShowPopover] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!feedbackMode) {
      setSelection(null);
      setShowPopover(false);
    }
  }, [feedbackMode]);

  const handleMouseUp = useCallback(() => {
    if (!feedbackMode || !containerRef.current) return;

    const windowSelection = window.getSelection();
    if (!windowSelection || windowSelection.toString().trim().length === 0) {
      return;
    }

    const selectedText = windowSelection.toString().trim();

    // Calculate character offsets in the markdown content
    // This is a simplified approach - in production you'd want more robust offset calculation
    const range = windowSelection.getRangeAt(0);
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(containerRef.current);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);

    const startOffset = preSelectionRange.toString().length;
    const endOffset = startOffset + selectedText.length;

    // Get position for popover
    const rect = range.getBoundingClientRect();
    const position = {
      x: rect.left + rect.width / 2 - 150, // Center popover
      y: rect.bottom + 10, // Below selection
    };

    setSelection({
      text: selectedText,
      startOffset,
      endOffset,
      position,
    });
    setShowPopover(true);
  }, [feedbackMode]);

  const handleSubmitFeedback = useCallback(
    (comment: string) => {
      if (!selection) return;

      const feedbackItem: FeedbackItem = {
        id: `feedback-${Date.now()}-${Math.random()}`,
        type: 'text',
        startOffset: selection.startOffset,
        endOffset: selection.endOffset,
        selectedText: selection.text,
        comment,
        status: 'pending',
      };

      onAddFeedback(feedbackItem);
      setShowPopover(false);
      setSelection(null);

      // Clear the browser selection
      window.getSelection()?.removeAllRanges();
    },
    [selection, onAddFeedback]
  );

  const handleCancelFeedback = useCallback(() => {
    setShowPopover(false);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  // Render content with highlights
  const renderContentWithHighlights = () => {
    if (feedbackItems.length === 0) {
      return <MarkdownRenderer content={content} />;
    }

    // For now, render without highlights (we'll enhance this to wrap feedback items)
    // A production implementation would parse the markdown AST and inject highlights
    return <MarkdownRenderer content={content} />;
  };

  return (
    <>
      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        className={`${className} ${feedbackMode ? 'cursor-text select-text' : ''}`}
      >
        {renderContentWithHighlights()}
      </div>

      <FeedbackPopover
        isOpen={showPopover}
        position={selection?.position || { x: 0, y: 0 }}
        selectedText={selection?.text || ''}
        onSubmit={handleSubmitFeedback}
        onCancel={handleCancelFeedback}
      />
    </>
  );
}
