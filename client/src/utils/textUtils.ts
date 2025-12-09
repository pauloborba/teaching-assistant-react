/**
 * Wraps text into multiple lines based on max width (approximate character count per line).
 * 
 * @param text - The text to wrap
 * @param maxCharsPerLine - Maximum characters per line before wrapping
 * @returns Array of lines
 */
export const wrapText = (text: string, maxCharsPerLine: number): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });
  if (currentLine) lines.push(currentLine);
  return lines;
};
