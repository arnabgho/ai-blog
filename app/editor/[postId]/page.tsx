'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { PreviewPane } from '@/components/editor/PreviewPane';
import { useRegenerate } from '@/hooks/useRegenerate';
import { v4 as uuidv4 } from 'uuid';
import {
  getPost,
  getVersion,
  updatePost,
  updateVersion,
  createVersion,
  calculateMetadata,
} from '@/lib/db';
import { insertImageAtOffset } from '@/lib/markdown-utils';
import type { BlogPost, PostVersion, FeedbackItem } from '@/lib/types';

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [version, setVersion] = useState<PostVersion | null>(null);
  const [markdown, setMarkdown] = useState('');
  const [feedbackMode, setFeedbackMode] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasRegeneratedBefore, setHasRegeneratedBefore] = useState(false);
  const [isFeedbackQueueMinimized, setIsFeedbackQueueMinimized] = useState(false);

  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);

  const { regenerate, isRegenerating, progress } = useRegenerate();

  useEffect(() => {
    loadPost();
  }, [postId]);

  async function loadPost() {
    try {
      const loadedPost = await getPost(postId);
      if (!loadedPost) {
        alert('Post not found');
        router.push('/');
        return;
      }

      const loadedVersion = await getVersion(loadedPost.currentVersionId);
      if (!loadedVersion) {
        alert('Version not found');
        router.push('/');
        return;
      }

      setPost(loadedPost);
      setVersion(loadedVersion);
      setMarkdown(loadedVersion.content);
    } catch (error) {
      console.error('Error loading post:', error);
      alert('Failed to load post');
    } finally {
      setLoading(false);
    }
  }

  // Auto-save with debounce
  useEffect(() => {
    if (!version || markdown === version.content) return;

    const timeoutId = setTimeout(async () => {
      try {
        const updatedVersion = {
          ...version,
          content: markdown,
          metadata: calculateMetadata(markdown),
        };
        await updateVersion(updatedVersion);
        setVersion(updatedVersion);

        if (post) {
          await updatePost({
            ...post,
            updatedAt: Date.now(),
          });
        }
      } catch (error) {
        console.error('Error auto-saving:', error);
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [markdown, version, post]);

  // Synchronized scrolling
  const handleScroll = useCallback((source: 'left' | 'right') => {
    return (e: React.UIEvent<HTMLDivElement>) => {
      const sourcePane = e.currentTarget;
      const targetPane = source === 'left' ? rightPaneRef.current : leftPaneRef.current;

      if (!targetPane) return;

      const scrollPercentage =
        sourcePane.scrollTop / (sourcePane.scrollHeight - sourcePane.clientHeight);

      targetPane.scrollTop =
        scrollPercentage * (targetPane.scrollHeight - targetPane.clientHeight);
    };
  }, []);

  function toggleFeedbackMode() {
    const newFeedbackMode = !feedbackMode;
    setFeedbackMode(newFeedbackMode);
    if (newFeedbackMode) setImageMode(false); // Disable image mode when enabling feedback
  }

  function toggleImageMode() {
    const newImageMode = !imageMode;
    setImageMode(newImageMode);
    if (newImageMode) setFeedbackMode(false); // Disable feedback mode when enabling image
  }

  async function handleRegenerateAll() {
    if (feedbackItems.length === 0 || !post || !version) return;

    await regenerate(markdown, feedbackItems, async (newMarkdown) => {
      // Update markdown
      setMarkdown(newMarkdown);

      // Create new version
      const newVersionNumber = version.versionNumber + 1;
      const newVersionId = uuidv4();

      const newVersion: PostVersion = {
        id: newVersionId,
        postId: post.id,
        versionNumber: newVersionNumber,
        content: newMarkdown,
        createdAt: Date.now(),
        metadata: calculateMetadata(newMarkdown),
      };

      await createVersion(newVersion);
      await updatePost({
        ...post,
        currentVersionId: newVersionId,
        updatedAt: Date.now(),
      });

      setVersion(newVersion);
      setFeedbackItems([]);
      setFeedbackMode(false);

      // Celebrate first regeneration
      if (!hasRegeneratedBefore) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
        setHasRegeneratedBefore(true);
      }
    });
  }

  function handleInsertImage(imageMarkdown: string, insertOffset: number) {
    console.log('Inserting image at offset', insertOffset, '- total length:', markdown.length);
    const newMarkdown = insertImageAtOffset(markdown, insertOffset, imageMarkdown);
    console.log('Image inserted, new length:', newMarkdown.length, 'old length:', markdown.length);
    setMarkdown(newMarkdown);
    // Auto-save will trigger automatically from the markdown change
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading editor...</p>
      </div>
    );
  }

  if (!post || !version) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Toolbar */}
      <div className="border-b border-border px-6 py-4 flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/')}>
            ← Back
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{post.title}</h1>
            <p className="text-sm text-muted-foreground">
              Version {version.versionNumber} • {version.metadata.wordCount} words
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant={feedbackMode ? 'accent' : 'outline'}
            onClick={toggleFeedbackMode}
          >
            {feedbackMode ? '✓ Feedback Mode' : 'Enter Feedback Mode'}
          </Button>
          <Button
            variant={imageMode ? 'accent' : 'outline'}
            onClick={toggleImageMode}
          >
            {imageMode ? '✨ Image Mode' : 'Enter Image Mode'}
          </Button>
        </div>
      </div>

      {/* Split View Editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Markdown Input */}
        <div
          ref={leftPaneRef}
          onScroll={handleScroll('left')}
          className="w-2/5 border-r border-border overflow-y-auto p-6"
        >
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            className="w-full h-full min-h-full resize-none bg-transparent font-mono text-sm focus:outline-none text-foreground"
            placeholder="Start writing your markdown here..."
            spellCheck={false}
          />
        </div>

        {/* Right Pane: Rendered Preview */}
        <div
          ref={rightPaneRef}
          onScroll={handleScroll('right')}
          className={`w-3/5 overflow-y-auto p-6 transition-colors ${
            feedbackMode ? 'feedback-mode-active' : ''
          }`}
        >
          <PreviewPane
            content={markdown}
            feedbackMode={feedbackMode}
            imageMode={imageMode}
            feedbackItems={feedbackItems}
            onAddFeedback={(item) => setFeedbackItems([...feedbackItems, item])}
            onInsertImage={handleInsertImage}
          />
        </div>
      </div>

      {/* Feedback Sidebar (shown when in feedback mode) */}
      {feedbackMode && (
        <div
          className={`fixed right-0 top-0 h-full bg-background border-l border-border shadow-2xl flex flex-col transition-all duration-300 ${
            isFeedbackQueueMinimized ? 'w-12' : 'w-80'
          }`}
        >
          <div className="p-4 border-b border-border flex items-center justify-between">
            {!isFeedbackQueueMinimized && (
              <h2 className="text-lg font-semibold">
                Feedback Queue ({feedbackItems.length})
              </h2>
            )}
            <button
              onClick={() => setIsFeedbackQueueMinimized(!isFeedbackQueueMinimized)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title={isFeedbackQueueMinimized ? 'Expand Queue' : 'Minimize Queue'}
            >
              {isFeedbackQueueMinimized ? '→' : '←'}
            </button>
          </div>

          {!isFeedbackQueueMinimized && (
            <div className="flex-1 overflow-y-auto p-4">
              {feedbackItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No feedback yet. Select text to start.
                </p>
              ) : (
              <div className="space-y-3">
                {feedbackItems.map((item, index) => {
                  const itemProgress = progress.get(item.id);
                  const isProcessing = itemProgress?.status === 'processing';
                  const isCompleted = itemProgress?.status === 'completed';

                  return (
                    <div
                      key={item.id}
                      className={`border border-border rounded-lg p-3 transition-colors ${
                        isCompleted
                          ? 'bg-success/20 border-success'
                          : isProcessing
                          ? 'bg-primary/10 border-primary animate-pulse'
                          : 'bg-muted/30'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          #{index + 1} {item.type === 'text' ? 'Text' : 'Image'} Feedback
                        </span>
                        {!isRegenerating && (
                          <button
                            onClick={() =>
                              setFeedbackItems(feedbackItems.filter((f) => f.id !== item.id))
                            }
                            className="text-muted-foreground hover:text-foreground"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <p className="text-sm mb-2 italic text-muted-foreground">
                        "{item.selectedText?.slice(0, 50)}..."
                      </p>
                      <p className="text-sm">{item.comment}</p>

                      {isProcessing && (
                        <div className="mt-2 text-xs text-primary font-medium">
                          ✨ Processing...
                        </div>
                      )}
                      {isCompleted && (
                        <div className="mt-2 text-xs text-success font-medium">
                          ✓ Completed
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          )}

          {!isFeedbackQueueMinimized && feedbackItems.length > 0 && (
            <div className="p-4 border-t border-border">
              <Button
                variant="primary"
                size="lg"
                onClick={handleRegenerateAll}
                disabled={isRegenerating}
                className="w-full gradient-shimmer text-white"
              >
                {isRegenerating
                  ? '✨ Regenerating...'
                  : `Regenerate All (${feedbackItems.length})`}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
