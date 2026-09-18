import { useQuery } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { graphApi } from './graph-api';
import { noteTypeMeta } from './utils/note-type-meta';
import { computeForceLayout } from './utils/graph-layout';

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 700;

export function NotesGraphPage() {
  const { data: graph } = useQuery({ queryKey: ['notes', 'graph'], queryFn: graphApi.get });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [hovered, setHovered] = useState<string | null>(null);
  const dragging = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const maxConnections = Math.max(1, ...nodes.map((n) => n.connectionCount));

  // Only recompute the (expensive) layout simulation when the node/edge SET changes,
  // never on pan/zoom/hover.
  const layoutKey = useMemo(
    () => nodes.map((n) => n.id).join(',') + '|' + edges.map((e) => `${e.sourceId}-${e.targetId}`).join(','),
    [nodes, edges],
  );
  const layout = useMemo(
    () => computeForceLayout(nodes.map((n) => n.id), edges, CANVAS_WIDTH, CANVAS_HEIGHT),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layoutKey],
  );

  function onMouseDown(e: React.MouseEvent) {
    dragging.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging.current) return;
    const dx = e.clientX - dragging.current.startX;
    const dy = e.clientY - dragging.current.startY;
    setPan({ x: dragging.current.panX + dx, y: dragging.current.panY + dy });
  }
  function onMouseUp() {
    dragging.current = null;
  }
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setZoom((z) => Math.max(0.3, Math.min(3, z - e.deltaY * 0.001)));
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Note graph</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {nodes.length} notes · {edges.length} links. Drag to pan, scroll to zoom.
      </p>

      <div className="mt-4 overflow-hidden rounded-lg border bg-card">
        <svg
          viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
          className="h-[600px] w-full cursor-grab active:cursor-grabbing"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
        >
          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
            {edges.map((e, i) => {
              const a = layout.get(e.sourceId);
              const b = layout.get(e.targetId);
              if (!a || !b) return null;
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="var(--border)"
                  strokeWidth={1}
                />
              );
            })}
            {nodes.map((n) => {
              const p = layout.get(n.id);
              if (!p) return null;
              const radius = 7 + (n.connectionCount / maxConnections) * 11;
              const meta = noteTypeMeta(n.noteType);
              return (
                <g
                  key={n.id}
                  transform={`translate(${p.x} ${p.y})`}
                  onMouseEnter={() => setHovered(n.id)}
                  onMouseLeave={() => setHovered((h) => (h === n.id ? null : h))}
                >
                  <circle r={radius} fill={meta.colorVar} opacity={hovered && hovered !== n.id ? 0.35 : 0.9} />
                  <Link to={`/notes/${n.id}`}>
                    <circle r={radius} fill="transparent" />
                  </Link>
                  {(hovered === n.id || radius > 14) && (
                    <text
                      y={-radius - 6}
                      textAnchor="middle"
                      className="pointer-events-none fill-foreground text-[10px]"
                    >
                      {n.title}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
