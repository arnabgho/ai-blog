'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface ImagePrompt {
  title: string;
  description: string;
}

interface ImageRequestPopoverProps {
  isOpen: boolean;
  position: { x: number; y: number };
  context: string;
  insertOffset: number;
  onInsert: (imageMarkdown: string, insertOffset: number) => void;
  onCancel: () => void;
}

export function ImageRequestPopover({
  isOpen,
  position,
  context,
  insertOffset,
  onInsert,
  onCancel,
}: ImageRequestPopoverProps) {
  const [tab, setTab] = useState<'ai' | 'manual'>('ai');
  const [suggestions, setSuggestions] = useState<ImagePrompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load AI suggestions on mount
  useEffect(() => {
    if (isOpen && tab === 'ai') {
      loadSuggestions();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  async function loadSuggestions() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/suggest-image-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, clickLine: insertOffset }),
      });

      if (!response.ok) {
        throw new Error('Failed to load suggestions');
      }

      const data = await response.json();
      setSuggestions(data.prompts);
    } catch (err) {
      console.error('Error loading suggestions:', err);
      setError('Failed to load AI suggestions. Please try manual mode.');
    } finally {
      setLoading(false);
    }
  }

  async function generateImage(prompt: string) {
    setGenerating(true);
    setSelectedPrompt(prompt);
    setError(null);

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `Image generation failed (${response.status})`;
        const errorDetails = errorData.details ? `\n\nDetails: ${errorData.details}` : '';
        throw new Error(errorMessage + errorDetails);
      }

      const data = await response.json();
      setGeneratedImage(data.imageUrl);
    } catch (err) {
      console.error('Error generating image:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to generate image. Please try again.'
      );
    } finally {
      setGenerating(false);
    }
  }

  function handleInsert() {
    if (!generatedImage) return;

    // Add cache-busting timestamp to force preview refresh
    const imageUrl = `${generatedImage}?t=${Date.now()}`;
    const imageMarkdown = `![AI-generated: ${selectedPrompt}](${imageUrl})`;
    onInsert(imageMarkdown, insertOffset);
    onCancel();
  }

  function handleRegenerate() {
    if (selectedPrompt) {
      setGeneratedImage(null);
      generateImage(selectedPrompt);
    }
  }

  // Calculate position to avoid overflow
  const calculatedLeft = Math.min(
    position.x,
    typeof window !== 'undefined' ? window.innerWidth - 520 : position.x
  );
  const calculatedTop = Math.min(
    position.y,
    typeof window !== 'undefined' ? window.innerHeight - 450 : position.y
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Modal - Centered */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] max-h-[90vh] bg-background border-2 border-accent rounded-lg shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header with tabs */}
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-semibold mb-2">Generate Image</h3>
              <div className="flex gap-2">
                <button
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    tab === 'ai'
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                  onClick={() => setTab('ai')}
                  disabled={generating}
                >
                  AI Suggestions
                </button>
                <button
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    tab === 'manual'
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                  onClick={() => setTab('manual')}
                  disabled={generating}
                >
                  Manual Prompt
                </button>
              </div>
            </div>

            {/* Context preview */}
            <div className="p-3 bg-muted/50 text-xs text-muted-foreground">
              <p className="italic line-clamp-2">
                &quot;{context.trim()}&quot;
              </p>
            </div>

            {/* Content area */}
            <div className="flex-1 p-4 overflow-y-auto">
              {error && (
                <div className="mb-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  {error}
                </div>
              )}

              {generatedImage ? (
                // Show generated image
                <div className="flex flex-col">
                  <img
                    src={generatedImage}
                    alt={selectedPrompt}
                    className="w-full rounded-lg mb-3 max-h-[400px] object-contain bg-muted/30"
                  />
                  <p className="text-sm text-muted-foreground mb-4 italic">
                    {selectedPrompt}
                  </p>
                  <div className="flex gap-2 justify-end">
                    <Button onClick={handleRegenerate} disabled={generating} variant="outline">
                      {generating ? 'Regenerating...' : 'Regenerate'}
                    </Button>
                    <Button variant="primary" onClick={handleInsert} disabled={generating}>
                      Insert Image
                    </Button>
                  </div>
                </div>
              ) : tab === 'ai' ? (
                // AI suggestions tab
                loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                    <p>Loading suggestions...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {suggestions.map((prompt, index) => (
                      <button
                        key={index}
                        onClick={() => generateImage(prompt.description)}
                        disabled={generating}
                        className="w-full p-3 border border-border rounded-lg hover:border-accent transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <h4 className="font-medium mb-1">{prompt.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {prompt.description}
                        </p>
                      </button>
                    ))}
                    {generating && (
                      <div className="text-center py-4 text-muted-foreground">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
                        <p className="text-sm">Generating image...</p>
                      </div>
                    )}
                  </div>
                )
              ) : (
                // Manual prompt tab
                <div>
                  <textarea
                    placeholder="Describe the image you want to generate..."
                    className="w-full h-32 px-3 py-2 border border-input rounded-lg bg-background resize-none text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    value={selectedPrompt}
                    onChange={(e) => setSelectedPrompt(e.target.value)}
                    disabled={generating}
                  />
                  <Button
                    variant="primary"
                    onClick={() => generateImage(selectedPrompt)}
                    disabled={!selectedPrompt.trim() || generating}
                    className="mt-2"
                  >
                    {generating ? 'Generating...' : 'Generate Image'}
                  </Button>
                  {generating && (
                    <div className="text-center mt-4 text-muted-foreground">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
                      <p className="text-sm">Generating image...</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border flex justify-end shrink-0">
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
