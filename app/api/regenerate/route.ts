import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { SYSTEM_PROMPT, buildRegenerationPrompt } from '@/lib/ai/prompts';
import { getContextAround, replaceSection } from '@/lib/markdown-utils';

export const runtime = 'edge';

interface FeedbackItem {
  id: string;
  type: 'text' | 'image';
  startOffset?: number;
  endOffset?: number;
  selectedText?: string;
  comment: string;
}

export async function POST(req: Request) {
  try {
    const { markdown, feedbackItems } = await req.json();

    if (!markdown || !feedbackItems || !Array.isArray(feedbackItems)) {
      return new Response('Invalid request body', { status: 400 });
    }

    // Create a stream encoder
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let currentMarkdown = markdown;

          // Process each feedback item sequentially
          for (const item of feedbackItems as FeedbackItem[]) {
            if (item.type !== 'text' || !item.startOffset || !item.endOffset) {
              continue;
            }

            // Send start event
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'start',
                  itemId: item.id,
                })}\n\n`
              )
            );

            // Get context around the selection
            const context = getContextAround(
              currentMarkdown,
              item.startOffset,
              item.endOffset,
              200
            );

            // Build the prompt
            const prompt = buildRegenerationPrompt(
              item.selectedText || '',
              item.comment,
              context
            );

            // Stream the regeneration from Claude
            const result = streamText({
              model: anthropic('claude-opus-4-5'),
              messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: prompt },
              ],
              temperature: 0.7,
            });

            let regeneratedText = '';

            // Stream the text chunks
            for await (const chunk of result.textStream) {
              regeneratedText += chunk;

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'content',
                    itemId: item.id,
                    text: chunk,
                  })}\n\n`
                )
              );
            }

            // Replace the section in markdown
            currentMarkdown = replaceSection(
              currentMarkdown,
              item.startOffset,
              item.endOffset,
              regeneratedText
            );

            // Send complete event
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'complete',
                  itemId: item.id,
                  regeneratedText,
                })}\n\n`
              )
            );
          }

          // Send final markdown
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'done',
                newMarkdown: currentMarkdown,
              })}\n\n`
            )
          );

          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                message: error instanceof Error ? error.message : 'Unknown error',
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
