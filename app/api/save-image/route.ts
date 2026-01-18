import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs'; // Need Node.js for file system

export async function POST(req: Request) {
  try {
    const { imageData, prompt } = await req.json();

    if (!imageData || typeof imageData !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid image data' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extract base64 data from data URI
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate unique filename
    const filename = `${uuidv4()}.png`;
    const filepath = join(process.cwd(), 'public', 'generated-images', filename);

    // Save file
    await writeFile(filepath, buffer);

    // Return public URL
    const imageUrl = `/generated-images/${filename}`;

    return new Response(
      JSON.stringify({ imageUrl, filename, prompt }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error saving image:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to save image',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
