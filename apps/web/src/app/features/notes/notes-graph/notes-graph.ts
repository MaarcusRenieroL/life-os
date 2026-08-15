import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { NoteFoldersApiService } from '../../../core/services/note-folders-api.service';
import { NoteGraphApiService } from '../../../core/services/note-graph-api.service';
import { NoteTagsApiService } from '../../../core/services/note-tags-api.service';
import { Folder, GraphEdge, GraphNode, Tag } from '../../../core/models/notes.model';
import { computeForceLayout } from '../shared/graph-layout.util';
import { categoryColor } from '../shared/template-category.util';
import { noteTypeMeta } from '../shared/note-type.util';

interface PositionedNode extends GraphNode {
  x: number;
  y: number;
  radius: number;
  color: string;
}

interface PositionedEdge {
  source: PositionedNode;
  target: PositionedNode;
}

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 700;

@Component({
  selector: 'app-notes-graph',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './notes-graph.html',
  styleUrl: './notes-graph.scss',
})
export class NotesGraph implements OnInit {
  private readonly graphApi = inject(NoteGraphApiService);
  private readonly foldersApi = inject(NoteFoldersApiService);
  private readonly tagsApi = inject(NoteTagsApiService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly rawNodes = signal<GraphNode[]>([]);
  protected readonly rawEdges = signal<GraphEdge[]>([]);
  protected readonly folders = signal<Folder[]>([]);
  protected readonly tags = signal<Tag[]>([]);

  protected readonly folderFilter = signal<Set<string>>(new Set());
  protected readonly tagFilter = signal<Set<string>>(new Set());
  protected readonly selectedNodeId = signal<string | null>(null);
  protected readonly hoveredNodeId = signal<string | null>(null);

  protected readonly transform = signal({ x: 0, y: 0, scale: 1 });
  private panState: { startX: number; startY: number; originX: number; originY: number } | null = null;

  protected readonly typeMeta = noteTypeMeta;

  protected readonly flatFolders = computed(() => this.flatten(this.folders()));

  protected readonly filteredNodes = computed(() => {
    const folderSet = this.folderFilter();
    const tagSet = this.tagFilter();

    return this.rawNodes().filter((n) => {
      if (folderSet.size > 0 && (!n.folderId || !folderSet.has(n.folderId))) return false;
      if (tagSet.size > 0 && !n.tagIds.some((t) => tagSet.has(t))) return false;
      return true;
    });
  });

  protected readonly filteredEdges = computed(() => {
    const ids = new Set(this.filteredNodes().map((n) => n.id));
    return this.rawEdges().filter((e) => ids.has(e.sourceId) && ids.has(e.targetId));
  });

  // Recomputes only when the filtered node/edge sets actually change -
  // running the force simulation is the expensive part, so it must not
  // re-run on every pan/zoom/hover signal write.
  protected readonly layout = computed<{ nodes: PositionedNode[]; edges: PositionedEdge[] }>(() => {
    const nodes = this.filteredNodes();
    const edges = this.filteredEdges();

    const positions = computeForceLayout(
      nodes.map((n) => n.id),
      edges.map((e) => ({ sourceId: e.sourceId, targetId: e.targetId })),
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
    );

    const maxConnections = Math.max(1, ...nodes.map((n) => n.connectionCount));

    const positioned: PositionedNode[] = nodes.map((n) => {
      const p = positions.get(n.id) ?? { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
      return {
        ...n,
        x: p.x,
        y: p.y,
        radius: 7 + (n.connectionCount / maxConnections) * 11,
        color: n.folderName ? categoryColor(n.folderName) : 'var(--muted-foreground)',
      };
    });

    const byId = new Map(positioned.map((n) => [n.id, n]));
    const positionedEdges: PositionedEdge[] = edges
      .map((e) => ({ source: byId.get(e.sourceId), target: byId.get(e.targetId) }))
      .filter((e): e is PositionedEdge => !!e.source && !!e.target);

    return { nodes: positioned, edges: positionedEdges };
  });

  protected readonly selectedNode = computed(
    () => this.layout().nodes.find((n) => n.id === this.selectedNodeId()) ?? null,
  );

  protected readonly hoveredNode = computed(
    () => this.layout().nodes.find((n) => n.id === this.hoveredNodeId()) ?? null,
  );

  protected readonly viewBox = computed(() => {
    const t = this.transform();
    const w = CANVAS_WIDTH / t.scale;
    const h = CANVAS_HEIGHT / t.scale;
    return `${t.x} ${t.y} ${w} ${h}`;
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.graphApi.get().subscribe({
      next: (graph) => {
        this.rawNodes.set(graph.nodes);
        this.rawEdges.set(graph.edges);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.foldersApi.list().subscribe((folders) => this.folders.set(folders));
    this.tagsApi.list().subscribe((tags) => this.tags.set(tags));
  }

  private flatten(folders: Folder[]): Folder[] {
    return folders.flatMap((f) => [f, ...this.flatten(f.children)]);
  }

  toggleFolderFilter(id: string): void {
    this.folderFilter.update((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  toggleTagFilter(id: string): void {
    this.tagFilter.update((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  clearFilters(): void {
    this.folderFilter.set(new Set());
    this.tagFilter.set(new Set());
  }

  selectNode(id: string): void {
    this.selectedNodeId.set(this.selectedNodeId() === id ? null : id);
  }

  hoverNode(id: string | null): void {
    this.hoveredNodeId.set(id);
  }

  openNote(id: string): void {
    this.router.navigate(['/notes', id]);
  }

  folderColor(folderName: string): string {
    return categoryColor(folderName);
  }

  // Pan/zoom - plain SVG viewBox math, no library.
  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const t = this.transform();
    const factor = event.deltaY > 0 ? 1.1 : 0.9;
    const newScale = Math.min(3, Math.max(0.3, t.scale * factor));
    this.transform.set({ ...t, scale: newScale });
  }

  onPanStart(event: MouseEvent): void {
    const t = this.transform();
    this.panState = { startX: event.clientX, startY: event.clientY, originX: t.x, originY: t.y };
  }

  onPanMove(event: MouseEvent): void {
    if (!this.panState) return;
    const t = this.transform();
    const dx = (event.clientX - this.panState.startX) / t.scale;
    const dy = (event.clientY - this.panState.startY) / t.scale;
    this.transform.set({ ...t, x: this.panState.originX - dx, y: this.panState.originY - dy });
  }

  onPanEnd(): void {
    this.panState = null;
  }

  resetView(): void {
    this.transform.set({ x: 0, y: 0, scale: 1 });
  }
}
