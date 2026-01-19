'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { FeedbackPopover } from './FeedbackPopover';
import { FeedbackHighlight } from './FeedbackHighlight';
import { ImageRequestPopover } from './ImageRequestPopover';
import type { FeedbackItem } from '@/lib/types';
import {
  calculateOffsetFromDOMPosition,
  extractContextAroundOffset,
  offsetToLine,
} from '@/lib/markdown-utils';

interface PreviewPaneProps {
  content: string;
  feedbackMode: boolean;
  imageMode: boolean;
  feedbackItems: FeedbackItem[];
  onAddFeedback: (feedback: FeedbackItem) => void;
  onInsertImage?: (imageMarkdown: string, insertOffset: number) => void;
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
  imageMode,
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
    insertOffset: number;
    context: string;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!feedbackMode && !imageMode) {
      setSelection(null);
      setShowPopover(false);
      setShowImagePopover(false);
      setImageRequest(null);
    }
  }, [feedbackMode, imageMode]);

  const handleMouseUp = useCallback(() => {
    if (!feedbackMode && !imageMode) return;
    if (!containerRef.current) return;

    const windowSelection = window.getSelection();
    if (!windowSelection || windowSelection.toString().trim().length === 0) {
      return;
    }

    const selectedText = windowSelection.toString().trim();

    // Calculate character offsets in the markdown content
    const range = windowSelection.getRangeAt(0);
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(containerRef.current);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);

    const startOffset = preSelectionRange.toString().length;
    const endOffset = startOffset + selectedText.length;

    if (imageMode) {
      // IMAGE MODE: Extract context around selection, show image popover
      // Find the selected text in the markdown source (not using rendered HTML offsets)
      let markdownOffset = content.indexOf(selectedText);

      // If exact match not found, try with first 100 chars (handles markdown formatting)
      if (markdownOffset === -1 && selectedText.length > 100) {
        const searchText = selectedText.slice(0, 100);
        markdownOffset = content.indexOf(searchText);
      }

      // If still not found, try first 50 chars
      if (markdownOffset === -1 && selectedText.length > 50) {
        const searchText = selectedText.slice(0, 50);
        markdownOffset = content.indexOf(searchText);
      }

      let context: string;
      let insertOffset: number;

      if (markdownOffset === -1) {
        console.warn('Selected text not found in markdown');
        context = selectedText;
        insertOffset = content.length;  // Insert at end if not found
      } else {
        // Found the text - extract context around it
        const midOffset = markdownOffset + Math.floor(selectedText.length / 2);
        context = extractContextAroundOffset(content, midOffset, 500);
        // Insert right after the selected text
        insertOffset = markdownOffset + selectedText.length;
        console.log('Image mode selection:', {
          selectedText: selectedText.slice(0, 50),
          markdownOffset,
          insertOffset,
          contentLength: content.length
        });
      }

      // Position popover in center (modal style, not below selection)
      setImageRequest({
        position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        insertOffset,
        context,
      });
      setShowImagePopover(true);

    } else if (feedbackMode) {
      // FEEDBACK MODE: Show feedback popover
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
    }
  }, [feedbackMode, imageMode, content]);

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

        // Calculate the actual character offset where user clicked
        const clickOffset = calculateOffsetFromDOMPosition(
          range,
          containerRef.current,
          content
        );

        // Extract context centered on the ACTUAL click position
        const context = extractContextAroundOffset(content, clickOffset, 250);

        // Calculate line number for insertion (keep this for insertion logic)
        const lineNumber = offsetToLine(content, clickOffset);

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
    (imageMarkdown: string, insertOffset: number) => {
      if (onInsertImage) {
        onInsertImage(imageMarkdown, insertOffset);
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
        className={`${className} ${feedbackMode || imageMode ? 'cursor-text select-text' : ''}`}
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
          insertOffset={imageRequest.insertOffset}
          onInsert={handleInsertImage}
          onCancel={handleCancelImage}
        />
      )}
    </>
  );
}
