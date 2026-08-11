'use client';

import React from 'react';

// Parse **bold** and *italic*/_italic_ inline
function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(<strong key={m.index} className="font-semibold">{m[1]}</strong>);
    else if (m[2]) parts.push(<em key={m.index} className="italic">{m[2]}</em>);
    else if (m[3]) parts.push(<em key={m.index} className="italic">{m[3]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function MarkdownText({ content, className = '' }: { content: string; className?: string }) {
  const lines = content.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      nodes.push(<div key={`sp-${i}`} className="h-1.5" />);
      i++;
      continue;
    }

    // Bullet list
    if (/^[-•*]\s/.test(trimmed)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^[-•*]\s/.test(lines[i].trim())) {
        const txt = lines[i].trim().replace(/^[-•*]\s/, '');
        items.push(
          <li key={i} className="flex items-start gap-2 leading-relaxed">
            <span className="mt-[5px] w-1.5 h-1.5 rounded-full bg-[var(--brand)] flex-shrink-0" />
            <span>{parseInline(txt)}</span>
          </li>
        );
        i++;
      }
      nodes.push(<ul key={`ul-${i}`} className="space-y-1 my-0.5">{items}</ul>);
      continue;
    }

    // Numbered list
    if (/^\d+[.)]\s/.test(trimmed)) {
      const items: React.ReactNode[] = [];
      let n = 1;
      while (i < lines.length && /^\d+[.)]\s/.test(lines[i].trim())) {
        const txt = lines[i].trim().replace(/^\d+[.)]\s/, '');
        items.push(
          <li key={i} className="flex items-start gap-2 leading-relaxed">
            <span className="font-semibold text-[var(--brand)] flex-shrink-0 min-w-[1.1rem] text-right">{n}.</span>
            <span>{parseInline(txt)}</span>
          </li>
        );
        i++;
        n++;
      }
      nodes.push(<ol key={`ol-${i}`} className="space-y-1 my-0.5">{items}</ol>);
      continue;
    }

    nodes.push(<p key={i} className="leading-relaxed">{parseInline(trimmed)}</p>);
    i++;
  }

  return <div className={`space-y-1 text-sm ${className}`}>{nodes}</div>;
}
