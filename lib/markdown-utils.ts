/**
 * Utilities for working with markdown content and text offsets
 */

/**
 * Extract text surrounding a given offset for context
 */
export function getContextAround(
  markdown: string,
  startOffset: number,
  endOffset: number,
  contextLength: number = 200
): { before: string; after: string } {
  const before = markdown.slice(
    Math.max(0, startOffset - contextLength),
    startOffset
  );

  const after = markdown.slice(
    endOffset,
    Math.min(markdown.length, endOffset + contextLength)
  );

  return { before, after };
}

/**
 * Replace a section of markdown with new content
 */
export function replaceSection(
  markdown: string,
  startOffset: number,
  endOffset: number,
  newContent: string
): string {
  return (
    markdown.slice(0, startOffset) +
    newContent +
    markdown.slice(endOffset)
  );
}

/**
 * Group feedback items by proximity (items within a certain distance are grouped together)
 */
export function groupFeedbackByProximity(
  items: Array<{ startOffset?: number; endOffset?: number }>,
  proximityThreshold: number = 100
): Array<Array<number>> {
  if (items.length === 0) return [];

  // Sort by start offset
  const indexed = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.startOffset !== undefined)
    .sort((a, b) => (a.item.startOffset || 0) - (b.item.startOffset || 0));

  const groups: Array<Array<number>> = [];
  let currentGroup: Array<number> = [indexed[0].index];

  for (let i = 1; i < indexed.length; i++) {
    const prevItem = indexed[i - 1].item;
    const currItem = indexed[i].item;

    const distance = (currItem.startOffset || 0) - (prevItem.endOffset || 0);

    if (distance <= proximityThreshold) {
      // Add to current group
      currentGroup.push(indexed[i].index);
    } else {
      // Start new group
      groups.push(currentGroup);
      currentGroup = [indexed[i].index];
    }
  }

  // Add the last group
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Find the line number of a character offset in markdown
 */
export function offsetToLine(markdown: string, offset: number): number {
  const upToOffset = markdown.slice(0, offset);
  return upToOffset.split('\n').length;
}

/**
 * Find the character offset of a line number in markdown
 */
export function lineToOffset(markdown: string, lineNumber: number): number {
  const lines = markdown.split('\n');
  let offset = 0;

  for (let i = 0; i < Math.min(lineNumber - 1, lines.length); i++) {
    offset += lines[i].length + 1; // +1 for newline character
  }

  return offset;
}

/**
 * Extract a section of markdown by line numbers
 */
export function extractLineRange(
  markdown: string,
  startLine: number,
  endLine: number
): string {
  const lines = markdown.split('\n');
  return lines.slice(startLine - 1, endLine).join('\n');
}
