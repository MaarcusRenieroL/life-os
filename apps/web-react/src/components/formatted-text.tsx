import type { ReactNode } from 'react';

/**
 * Renders plain text that uses short heading lines and "- " bullet prefixes (the shape Claude is
 * asked to produce for job descriptions) as real headings/paragraphs/lists, instead of dumping it
 * all as one unbroken block via white-space: pre-wrap. Works line-by-line rather than requiring a
 * blank line between every section, since the model doesn't always insert one consistently.
 */
export function FormattedText({ text }: { text: string }) {
  const lines = text.trim().split('\n');
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let bullets: string[] = [];
  let key = 0;

  function flushParagraph() {
    if (paragraph.length > 0) {
      blocks.push(
        <p key={key++} className="text-sm text-muted-foreground">
          {paragraph.join(' ')}
        </p>,
      );
      paragraph = [];
    }
  }

  function flushBullets() {
    if (bullets.length > 0) {
      blocks.push(
        <ul key={key++} className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {bullets.map((bullet, i) => (
            <li key={i}>{bullet}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushBullets();
      continue;
    }

    const bulletMatch = /^[-•]\s+(.*)/.exec(line);
    if (bulletMatch) {
      flushParagraph();
      bullets.push(bulletMatch[1]);
      continue;
    }
    flushBullets();

    const isHeading = paragraph.length === 0 && line.length < 60 && !/[.,;:]$/.test(line);
    if (isHeading) {
      flushParagraph();
      blocks.push(
        <h3 key={key++} className="text-sm font-semibold text-foreground">
          {line}
        </h3>,
      );
      continue;
    }

    paragraph.push(line);
  }
  flushParagraph();
  flushBullets();

  return <div className="flex flex-col gap-3">{blocks}</div>;
}
