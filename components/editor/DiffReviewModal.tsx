'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { parseDiff, Diff, Hunk } from 'react-diff-view';
import { formatLines, diffLines } from 'unidiff';
import 'react-diff-view/style/index.css';

interface DiffReviewModalProps {
  isOpen: boolean;
  beforeContent: string;
  afterContent: string;
  onAccept: () => void;
  onReject: () => void;
}

export function DiffReviewModal({
  isOpen,
  beforeContent,
  afterContent,
  onAccept,
  onReject,
}: DiffReviewModalProps) {
  const diffText = useMemo(() => {
    // Create unified diff format
    const oldLines = beforeContent.split('\n');
    const newLines = afterContent.split('\n');

    // Generate diff using unidiff
    const diffResult = diffLines(oldLines, newLines);
    return formatLines(diffResult, { context: 3 });
  }, [beforeContent, afterContent]);

  const files = useMemo(() => {
    // Parse the diff into a format react-diff-view can use
    if (!diffText) return [];

    try {
      return parseDiff(diffText, { nearbySequences: 'zip' });
    } catch (error) {
      console.error('Error parsing diff:', error);
      return [];
    }
  }, [diffText]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal Content */}
      <div className="relative w-full h-full max-w-[95vw] max-h-[95vh] bg-background border border-border rounded-lg shadow-2xl flex flex-col m-4">
        {/* Header */}
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-2xl font-bold">Review Changes</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review the AI-regenerated changes below
          </p>
        </div>

        {/* Diff View */}
        <div className="flex-1 overflow-auto">
          <style jsx global>{`
            /* Only override colors for better readability */
            .diff-gutter-insert {
              background-color: hsl(142 76% 36% / 0.2) !important;
            }

            .diff-code-insert {
              background-color: hsl(142 76% 36% / 0.15) !important;
            }

            .diff-gutter-delete {
              background-color: hsl(0 72% 51% / 0.2) !important;
            }

            .diff-code-delete {
              background-color: hsl(0 72% 51% / 0.15) !important;
            }

            .diff-code {
              color: hsl(var(--foreground)) !important;
            }
          `}</style>
          <div className="p-6">
            {files.map((file, index) => (
              <Diff
                key={index}
                viewType="split"
                diffType={file.type}
                hunks={file.hunks}
              >
                {(hunks) =>
                  hunks.map((hunk) => (
                    <Hunk key={hunk.content} hunk={hunk} />
                  ))
                }
              </Diff>
            ))}

            {files.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                No changes detected
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Review the changes carefully before accepting or rejecting
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onReject}
              className="border-destructive text-destructive hover:bg-destructive/10"
              size="lg"
            >
              Reject Changes
            </Button>
            <Button
              variant="primary"
              onClick={onAccept}
              className="gradient-shimmer"
              size="lg"
            >
              Accept Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
