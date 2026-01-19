'use client';

import { Button } from '@/components/ui/button';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';

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
            Compare the original content (left) with AI-regenerated content (right)
          </p>
        </div>

        {/* Side-by-Side Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Before (Original) */}
          <div className="w-1/2 border-r border-border flex flex-col">
            <div className="bg-destructive/10 px-4 py-2 border-b border-border">
              <p className="font-semibold text-sm">Before (Original)</p>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <MarkdownRenderer content={beforeContent} />
            </div>
          </div>

          {/* After (Regenerated) */}
          <div className="w-1/2 flex flex-col">
            <div className="bg-primary/10 px-4 py-2 border-b border-border">
              <p className="font-semibold text-sm">After (Regenerated)</p>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <MarkdownRenderer content={afterContent} />
            </div>
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
