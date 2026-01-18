import { useState, useCallback } from 'react';
import type { FeedbackItem } from '@/lib/types';

interface RegenerationState {
  isRegenerating: boolean;
  progress: Map<string, { status: 'pending' | 'processing' | 'completed'; text: string }>;
}

export function useRegenerate() {
  const [state, setState] = useState<RegenerationState>({
    isRegenerating: false,
    progress: new Map(),
  });

  const regenerate = useCallback(
    async (
      markdown: string,
      feedbackItems: FeedbackItem[],
      onComplete: (newMarkdown: string) => void
    ) => {
      setState({
        isRegenerating: true,
        progress: new Map(
          feedbackItems.map((item) => [item.id, { status: 'pending', text: '' }])
        ),
      });

      try {
        const response = await fetch('/api/regenerate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            markdown,
            feedbackItems: feedbackItems.map((item) => ({
              id: item.id,
              type: item.type,
              startOffset: item.startOffset,
              endOffset: item.endOffset,
              selectedText: item.selectedText,
              comment: item.comment,
            })),
          }),
        });

        if (!response.ok) {
          throw new Error('Regeneration failed');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        let done = false;

        while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;

          if (value) {
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));

                  if (data.type === 'start') {
                    setState((prev) => ({
                      ...prev,
                      progress: new Map(prev.progress).set(data.itemId, {
                        status: 'processing',
                        text: '',
                      }),
                    }));
                  } else if (data.type === 'content') {
                    setState((prev) => {
                      const newProgress = new Map(prev.progress);
                      const current = newProgress.get(data.itemId);
                      if (current) {
                        newProgress.set(data.itemId, {
                          ...current,
                          text: current.text + data.text,
                        });
                      }
                      return { ...prev, progress: newProgress };
                    });
                  } else if (data.type === 'complete') {
                    setState((prev) => {
                      const newProgress = new Map(prev.progress);
                      newProgress.set(data.itemId, {
                        status: 'completed',
                        text: data.regeneratedText,
                      });
                      return { ...prev, progress: newProgress };
                    });
                  } else if (data.type === 'done') {
                    onComplete(data.newMarkdown);
                    setState({
                      isRegenerating: false,
                      progress: new Map(),
                    });
                  } else if (data.type === 'error') {
                    throw new Error(data.message);
                  }
                } catch (e) {
                  console.error('Error parsing SSE data:', e);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Regeneration error:', error);
        alert('Failed to regenerate content. Please try again.');
        setState({
          isRegenerating: false,
          progress: new Map(),
        });
      }
    },
    []
  );

  return {
    regenerate,
    isRegenerating: state.isRegenerating,
    progress: state.progress,
  };
}
