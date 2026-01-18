'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { FeedbackPopover } from './FeedbackPopover';
import { FeedbackHighlight } from './FeedbackHighlight';
import { ImageRequestPopover } from './ImageRequestPopover';
import type { FeedbackItem } from '@/lib/types';
import {
  calculateLineFromDOMPosition,
  extractContextAroundLine,
} from '@/lib/markdown-utils';

interface PreviewPaneProps {
  content: string;
  feedbackMode: boolean;
  feedbackItems: FeedbackItem[];
  onAddFeedback: (feedback: FeedbackItem) => void;
  onInsertImage?: (imageMarkdown: string, lineNumber: number) => void;
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
  onInsertImage,
  className = '',
}: PreviewPaneProps) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [showPopover, setShowPopover] = useState(false);
  const [showImagePopover, setShowImagePopover] = useState(false);
  const [imageRequest, setImageRequest] = useState<{
    position: { x: number; y: number };
    lineNumber: number;
    context: string;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!feedbackMode) {
      setSelection(null);
      setShowPopover(false);
      setShowImagePopover(false);
      setImageRequest(null);
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

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!feedbackMode || !containerRef.current) return;

      // Detect if it's a right-click or Cmd+Click
      if (e.button === 2 || (e.button === 0 && e.metaKey)) {
        e.preventDefault();

        // Get click position
        const clickX = e.clientX;
        const clickY = e.clientY;

        // Find the closest text node to the click
        const range = document.caretRangeFromPoint
          ? document.caretRangeFromPoint(clickX, clickY)
          : null;

        if (!range) return;

        // Calculate line number in markdown
        const lineNumber = calculateLineFromDOMPosition(
          range,
          containerRef.current,
          content
        );

        // Extract context around that line
        const context = extractContextAroundLine(content, lineNumber, 250);

        setImageRequest({
          position: { x: clickX, y: clickY },
          lineNumber,
          context,
        });
        setShowImagePopover(true);
      }
    },
    [feedbackMode, content]
  );

  const handleInsertImage = useCallback(
    (imageMarkdown: string, lineNumber: number) => {
      if (onInsertImage) {
        onInsertImage(imageMarkdown, lineNumber);
      }
      setShowImagePopover(false);
      setImageRequest(null);
    },
    [onInsertImage]
  );

  const handleCancelImage = useCallback(() => {
    setShowImagePopover(false);
    setImageRequest(null);
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
        onClick={handleClick}
        onContextMenu={handleClick}
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

      {showImagePopover && imageRequest && (
        <ImageRequestPopover
          isOpen={showImagePopover}
          position={imageRequest.position}
          context={imageRequest.context}
          lineNumber={imageRequest.lineNumber}
          onInsert={handleInsertImage}
          onCancel={handleCancelImage}
        />
      )}
    </>
  );
}
