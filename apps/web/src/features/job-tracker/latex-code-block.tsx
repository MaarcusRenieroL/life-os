import type { ReactNode } from 'react';

// \command, {braces}, and %comments are the tokens worth calling out in a resume
// template - enough to make the structure scannable without pulling in a full
// syntax-highlighting library for one code block.
const TOKEN_PATTERN = /(%[^\n]*)|(\\[a-zA-Z]+\*?)|([{}])/g;

function highlight(source: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN_PATTERN.exec(source))) {
    if (match.index > lastIndex) {
      nodes.push(source.slice(lastIndex, match.index));
    }
    const [, comment, command, brace] = match;
    if (comment) {
      nodes.push(<span key={key++} className="text-muted-foreground/60 italic">{comment}</span>);
    } else if (command) {
      nodes.push(<span key={key++} className="text-primary">{command}</span>);
    } else if (brace) {
      nodes.push(<span key={key++} className="text-yellow-500/80">{brace}</span>);
    }
    lastIndex = TOKEN_PATTERN.lastIndex;
  }
  if (lastIndex < source.length) {
    nodes.push(source.slice(lastIndex));
  }
  return nodes;
}

export function LatexCodeBlock({ source }: { source: string }) {
  return (
    <pre className="max-h-[32rem] overflow-auto rounded-md border bg-background p-3.5 text-xs leading-relaxed whitespace-pre-wrap break-words">
      <code>{highlight(source)}</code>
    </pre>
  );
}

export function downloadLatex(source: string, fileName: string) {
  const blob = new Blob([source], { type: 'application/x-tex' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
