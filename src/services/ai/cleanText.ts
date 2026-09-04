/**
 * Utility to sanitize and ensure AI assistant responses are strictly plain text
 * without raw Markdown formatting (asterisks, hashtags, backticks, etc.)
 */
export function cleanPlainAssistantText(rawText: string | null | undefined): string {
  if (!rawText) return '';
  let text = String(rawText);

  // 1. Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, (match) => {
    return match.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '');
  });

  // 2. Remove inline code backticks `code` -> code
  text = text.replace(/`([^`]+)`/g, '$1');

  // 3. Remove Markdown bold / italic (***text***, **text**, *text*, ___text___, __text__, _text_)
  text = text.replace(/\*\*\*([^*]+)\*\*\*/g, '$1');
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');
  text = text.replace(/___([^_]+)___/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  text = text.replace(/_([^_]+)_/g, '$1');

  // 4. Remove Markdown headings (# Heading, ## Heading, ### Heading)
  text = text.replace(/^#{1,6}\s+/gm, '');

  // 5. Convert markdown bullet points (* item or - item) at line beginnings to clean bullets (• item)
  text = text.replace(/^[\*\-]\s+/gm, '• ');

  // 6. Strip any leftover stray double/single asterisks or double hashtags
  text = text.replace(/\*\*/g, '');
  text = text.replace(/(^|\s)\*(\s|$)/g, '$1$2');
  text = text.replace(/#{2,}/g, '');

  // 7. Clean excessive line breaks (limit to max 2 newlines) and trim whitespace
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return text;
}
