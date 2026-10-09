import { Fragment, type ReactNode } from 'react';

/**
 * Arabic letters and the spaces and marks between them: one run, so "ق ط ب ج د" or a word
 * with its harakāt stays whole.
 */
const RUN = /[؀-ۿݐ-ݿࢠ-ࣿ](?:[؀-ۿݐ-ݿࢠ-ࣿ\s]*[؀-ۿݐ-ݿࢠ-ࣿ])?/gu;

/**
 * A catalog text with its Arabic runs marked `lang="ar" dir="rtl"` and isolated (`bdi`), so a
 * word like قَدْحًا inside a German sentence is read, shaped and ordered as Arabic.
 */
export function ArabicRuns({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(RUN)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <bdi key={match.index} lang="ar" dir="rtl">
        {match[0]}
      </bdi>
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <Fragment>{parts}</Fragment>;
}
