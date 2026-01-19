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

/**
 * Calculate character offset from DOM position
 * Returns the exact character position in the markdown where the user clicked
 */
export function calculateOffsetFromDOMPosition(
  range: Range,
  containerElement: HTMLElement,
  markdown: string
): number {
  let offset = 0;

  // Walk up the DOM tree and calculate offset
  let node: Node | null = range.startContainer;

  // First, add the offset within the start container
  offset += range.startOffset;

  // Then walk up and accumulate offsets from previous siblings
  while (node && node !== containerElement) {
    const parent = node.parentNode;
    if (!parent) break;

    const siblings = Array.from(parent.childNodes);
    const index = siblings.indexOf(node as ChildNode);

    for (let i = 0; i < index; i++) {
      offset += siblings[i].textContent?.length || 0;
    }

    node = parent;
  }

  return offset;
}

/**
 * Calculate line number from DOM position
 * This is a simplified version - in production you'd want more robust offset calculation
 */
export function calculateLineFromDOMPosition(
  range: Range,
  containerElement: HTMLElement,
  markdown: string
): number {
  const offset = calculateOffsetFromDOMPosition(range, containerElement, markdown);
  return offsetToLine(markdown, offset);
}

/**
 * Extract context around a specific character offset
 * This is more accurate than extractContextAroundLine because it centers
 * on the EXACT click position, not just the line start
 */
export function extractContextAroundOffset(
  markdown: string,
  offset: number,
  contextChars: number = 250
): string {
  const startOffset = Math.max(0, offset - contextChars);
  const endOffset = Math.min(markdown.length, offset + contextChars);

  return markdown.slice(startOffset, endOffset);
}

/**
 * Extract context around a line number
 * @deprecated Use extractContextAroundOffset() for more accurate context extraction
 */
export function extractContextAroundLine(
  markdown: string,
  lineNumber: number,
  contextChars: number = 250
): string {
  const lineOffset = lineToOffset(markdown, lineNumber);
  const startOffset = Math.max(0, lineOffset - contextChars);
  const endOffset = Math.min(markdown.length, lineOffset + contextChars);

  return markdown.slice(startOffset, endOffset);
}

/**
 * Insert image markdown at a specific line
 */
export function insertImageAtLine(
  markdown: string,
  lineNumber: number,
  imageMarkdown: string
): string {
  const lines = markdown.split('\n');

  // Insert after the specified line (or at the beginning if line 0)
  const insertIndex = Math.max(0, Math.min(lineNumber, lines.length));

  console.log('insertImageAtLine:', {
    lineNumber,
    insertIndex,
    totalLines: lines.length,
    imageMarkdown: imageMarkdown.slice(0, 50)
  });

  lines.splice(insertIndex, 0, '', imageMarkdown, '');

  return lines.join('\n');
}

/**
 * Insert image markdown at a specific character offset
 */
export function insertImageAtOffset(
  markdown: string,
  offset: number,
  imageMarkdown: string
): string {
  // Ensure offset is within bounds
  const insertOffset = Math.max(0, Math.min(offset, markdown.length));

  console.log('insertImageAtOffset:', {
    offset,
    insertOffset,
    markdownLength: markdown.length,
    imageMarkdown: imageMarkdown.slice(0, 50)
  });

  // Find the START of the current line (insert before the line, not in the middle)
  let startOfLine = insertOffset;
  while (startOfLine > 0 && markdown[startOfLine - 1] !== '\n') {
    startOfLine--;
  }

  // Insert: before line + image + empty line + line content
  const before = markdown.slice(0, startOfLine);
  const after = markdown.slice(startOfLine);

  // Add spacing around the image
  let insertion = imageMarkdown + '\n\n';

  // If we're NOT at the very beginning, add leading newline
  if (startOfLine > 0) {
    insertion = '\n' + insertion;
  }

  return before + insertion + after;
}
