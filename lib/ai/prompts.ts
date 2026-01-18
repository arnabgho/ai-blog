export const SYSTEM_PROMPT = `You are an expert blog editor helping refine content based on reader feedback.
Your role is to improve ONLY the specified section while maintaining:
- Natural flow with surrounding content
- Author's voice and style
- Factual accuracy
- Appropriate length (don't expand unnecessarily unless specifically requested)

Output ONLY the improved text without explanations or meta-commentary.`;

export function buildRegenerationPrompt(
  selectedText: string,
  feedback: string,
  context?: { before: string; after: string }
): string {
  let prompt = `Improve this section based on feedback.\n\nORIGINAL SECTION:\n"""\n${selectedText}\n"""\n\nREADER FEEDBACK:\n${feedback}`;

  if (context) {
    prompt += `\n\nCONTEXT BEFORE:\n${context.before}\n\nCONTEXT AFTER:\n${context.after}`;
  }

  prompt += `\n\nRewrite the section to address the feedback. Output only the improved text.`;

  return prompt;
}
