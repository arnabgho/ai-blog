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
      // IMAGE MODE: Use word matching to find location in markdown
      // Extract 7 significant words (length > 3) from selection
      const words = selectedText
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 3 && !/^[^a-z]+$/.test(w)) // Filter out short words and non-letter words
        .slice(0, 7); // Take first 7 significant words

      console.log('Searching for words:', words);

      // Find the first location where all these words appear nearby in the markdown
      let markdownOffset = -1;

      if (words.length > 0) {
        for (let i = 0; i < content.length - 50; i++) {
          // Check a window of text around this position
          const windowSize = Math.max(selectedText.length + 300, 500);
          const window = content.slice(i, i + windowSize).toLowerCase();

          // Check if all words are found in this window
          const allWordsFound = words.every(word => window.includes(word));

          if (allWordsFound) {
            // Find where the FIRST word actually appears in the window
            const firstWordPos = window.indexOf(words[0]);

            // The actual position in the full content
            markdownOffset = i + firstWordPos;

            console.log('Found match:', {
              windowStart: i,
              firstWordPos,
              finalOffset: markdownOffset,
              firstWord: words[0]
            });
            break;
          }
        }
      }

      let context: string;
      let insertOffset: number;

      if (markdownOffset === -1) {
        console.warn('Could not find location using word matching. Words searched:', words);
        context = selectedText;
        insertOffset = content.length; // Fallback to end
      } else {
        // Found the actual location of the first word
        insertOffset = markdownOffset;
        context = selectedText; // Use only the selected text, nothing more

        console.log('Image mode selection:', {
          selectedText: selectedText.slice(0, 50),
          wordsMatched: words,
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
