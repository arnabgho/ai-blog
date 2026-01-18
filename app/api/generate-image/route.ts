export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { prompt, context } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return new Response('Invalid request body', { status: 400 });
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      console.error('GOOGLE_AI_API_KEY not configured');
      return new Response(
        JSON.stringify({
          error: 'Image generation not configured',
          message: 'GOOGLE_AI_API_KEY environment variable is missing',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Enhance the prompt with context if provided
    const enhancedPrompt = context
      ? `${prompt}\n\nContext: This image will accompany text about: ${context.slice(0, 200)}`
      : prompt;

    // Call Gemini API using the correct endpoint format
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: enhancedPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return new Response(
        JSON.stringify({
          error: 'Image generation failed',
          message: `API returned ${response.status}`,
          details: errorText,
        }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();

    // Extract image from response
    // The response format is: { candidates: [{ content: { parts: [{ text, inlineData }] } }] }
    if (!data.candidates || !data.candidates[0]?.content?.parts) {
      console.error('Unexpected API response format:', JSON.stringify(data));
      return new Response(
        JSON.stringify({
          error: 'Invalid API response',
          message: 'Unexpected response structure from Gemini API',
          details: JSON.stringify(data),
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Find the image part in the response
    const parts = data.candidates[0].content.parts;
    const imagePart = parts.find((part: any) => part.inlineData);

    if (!imagePart || !imagePart.inlineData?.data) {
      console.error('No image found in response:', JSON.stringify(data));
      return new Response(
        JSON.stringify({
          error: 'No image generated',
          message: 'Gemini API did not return an image',
          details: JSON.stringify(data),
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const imageBase64 = imagePart.inlineData.data;
    const mimeType = imagePart.inlineData.mimeType || 'image/png';

    // Create data URI temporarily
    const imageDataUri = `data:${mimeType};base64,${imageBase64}`;

    // Save to file system
    const saveResponse = await fetch(new URL('/api/save-image', req.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData: imageDataUri, prompt }),
    });

    if (!saveResponse.ok) {
      const errorData = await saveResponse.json().catch(() => ({}));
      throw new Error(`Failed to save image to file system: ${errorData.error || saveResponse.status}`);
    }

    const { imageUrl } = await saveResponse.json();

    return new Response(
      JSON.stringify({
        imageUrl,
        prompt,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('API error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
