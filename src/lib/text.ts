export function endSentence(text: string): string {
  return text.endsWith('.') ? text : `${text}.`;
}
