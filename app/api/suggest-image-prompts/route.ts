import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export const runtime = 'edge';

interface ImagePrompt {
  title: string;
  description: string;
}

export async function POST(req: Request) {
  try {
    const { context, clickLine } = await req.json();

    if (!context || typeof context !== 'string') {
      return new Response('Invalid request body', { status: 400 });
    }

    const prompt = `You are helping create compelling images for a blog post.

USER SELECTED THIS TEXT:
"""
${context.slice(0, 300)}
"""

The user wants to generate an image to illustrate this specific text.
Generate 3 diverse, visually interesting image prompts that would enhance this content.
Each should be 1-2 sentences describing a specific, concrete image that directly relates to the selected text.

Focus on:
- Visual elements mentioned or implied in the selected text
- Concepts and themes that could be illustrated
- Scenes or objects that would help readers understand the content

Return as JSON array with format:
[
  { "title": "Short title", "description": "Detailed image description" },
  { "title": "Short title", "description": "Detailed image description" },
  { "title": "Short title", "description": "Detailed image description" }
]

Return ONLY the JSON array, no other text.`;

    const result = await generateText({
      model: anthropic('claude-sonnet-4-0'),
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
    });

    // Parse the response text as JSON
    let prompts: ImagePrompt[];
    try {
      // Try to extract JSON from the response
      const jsonMatch = result.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }
      prompts = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse AI response:', result.text);
      // Fallback prompts
      prompts = [
        {
          title: 'Contextual Illustration',
          description: 'A modern, clean illustration that captures the essence of the surrounding text',
        },
        {
          title: 'Conceptual Diagram',
          description: 'A simple diagram or infographic that visualizes key concepts from this section',
        },
        {
          title: 'Atmospheric Scene',
          description: 'A photorealistic scene that sets the mood and tone for this part of the article',
        },
      ];
    }

    return new Response(JSON.stringify({ prompts }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
