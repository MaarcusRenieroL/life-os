import {
  activeFilterIds,
  aggregateOf,
  describeFilter,
  facetOptions,
  filterRows,
  isEmptyFilter,
  orderedColumns,
  runGrid,
  toCsv,
  toneFor,
  visibleColumns,
  type GridColumnDef,
  type GridView,
  type SortState,
  type Tone,
} from '@life-os/core';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';

import { Btn, DateInput, Input, Sheet } from '@/kit';
import { Text } from '@/text';
import { C } from '@/theme';
import { Muted, tap } from '@/ui';

import { useGrid, type Grid } from './use-grid';

/** A column: the shared definition plus how this app draws a value. */
export interface Col<T> extends GridColumnDef<T> {
  /** Custom cell; defaults to the formatted value (status words become coloured pills). */
  cell?: (row: T) => ReactNode;
}

export interface DataGridProps<T> {
  /** Stable id, e.g. `finance.accounts` - the key the layout is saved under. */
  tableId: string;
  data: T[];
  columns: Col<T>[];
  getRowId: (row: T) => string;
  loading?: boolean;
  emptyMessage?: ReactNode;
  initialSorting?: SortState[];
  initialFilters?: Record<string, unknown>;
  /** Rows shown at first and added by each "Show more". */
  initialPageSize?: number;
  searchPlaceholder?: string;
  /** Tap a row. Without it a tap opens the record sheet. */
  onRowClick?: (row: T) => void;
  /** Buttons in the record sheet (and the "Open" button when `onRowClick` is also given). */
  rowActions?: (row: T, close: () => void) => ReactNode;
  /** Shown at the right edge of each card, e.g. a checkbox. */
  trailing?: (row: T) => ReactNode;
  selectable?: boolean;
  bulkActions?: (selected: T[], clear: () => void) => ReactNode;
  toolbarEnd?: ReactNode;
  /** Shows "Share CSV", named after this. */
  exportName?: string;
  /** Ready-made views as chips under the search box; "All" is always there. */
  views?: GridView[];
  /** Tap opens the record sheet (default true unless `onRowClick` is given). */
  drawer?: boolean;
  drawerTitle?: (row: T) => ReactNode;
  drawerExtra?: (row: T) => ReactNode;
  /** Dim a row (e.g. a paused rule). */
  dim?: (row: T) => boolean;
}

const TONE: Record<Tone, string> = { success: C.accent, warn: C.gold, danger: C.magenta, info: C.cyan, neutral: C.muted };
const asText = (v: unknown) => (Array.isArray(v) ? v.join(', ') : v === null || v === undefined ? '' : String(v));

function StatusPill({ text }: { text: string }) {
  const color = TONE[toneFor(text)];
  return (
    <View style={{ borderColor: `${color}66`, backgroundColor: `${color}1a`, borderWidth: 1, borderRadius: 3, paddingHorizontal: 6, paddingVertical: 1 }}>
      <Text style={{ color, fontSize: 11 }}>{text}</Text>
    </View>
  );
}

function renderCell<T>(col: Col<T>, row: T): ReactNode {
  if (col.cell) return col.cell(row);
  const raw = col.value(row);
  if (col.filter?.type === 'boolean') return <Text style={{ color: C.text, fontSize: 13 }}>{raw ? (col.filter.labels?.[0] ?? 'Yes') : (col.filter.labels?.[1] ?? 'No')}</Text>;
  const text = col.format ? col.format(raw) : asText(raw);
  if (!text) return <Text style={{ color: C.muted, fontSize: 13 }}>—</Text>;
  if (col.filter?.type === 'select' && toneFor(text) !== 'neutral') return <StatusPill text={text} />;
  return <Text style={{ color: C.text, fontSize: 13 }}>{text}</Text>;
}

function PillButton({ label, on, onPress, count }: { label: string; on?: boolean; onPress: () => void; count?: number }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 7, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: on ? C.accent : C.input, backgroundColor: on ? '#4fcb6f24' : '#ffffff0d' }}>
      <Text style={{ color: on ? C.accent : C.text, fontSize: 13 }}>{label}</Text>
      {count ? <View style={{ backgroundColor: C.accent, borderRadius: 8, paddingHorizontal: 5 }}><Text style={{ color: C.accentFg, fontSize: 10, fontWeight: '700' }}>{count}</Text></View> : null}
    </Pressable>
  );
}

function Section({ children }: { children: string }) {
  return <Text style={{ color: C.muted, fontSize: 10, letterSpacing: 1.8, marginTop: 14, marginBottom: 8 }}>{children.toUpperCase()}</Text>;
}

export function DataGrid<T>(props: DataGridProps<T>) {
  const { tableId, data, columns, getRowId, loading, emptyMessage, onRowClick, rowActions, trailing, selectable, bulkActions, exportName, views: builtIn = [] } = props;
  const g = useGrid(tableId, columns, { sorting: props.initialSorting, filters: props.initialFilters, pageSize: props.initialPageSize });
  const { state } = g;
  const [panel, setPanel] = useState<null | 'filter' | 'sort' | 'view'>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [more, setMore] = useState({ signature: '', limit: 0 });
  const useSheet = props.drawer ?? !onRowClick;

  // A new search, filter or sort starts the list from the top again.
  const signature = JSON.stringify([state.search, state.filters, state.sorting, state.pageSize]);
  const limit = more.signature === signature ? more.limit : state.pageSize;

  const result = useMemo(() => runGrid(data, columns, { ...state, page: 0, pageSize: Math.max(1, data.length) }), [data, columns, state]);
  const rows = result.sorted;
  const shown = visibleColumns(columns, state) as Col<T>[];
  const filterIds = activeFilterIds(columns, state.filters);
  const filtering = filterIds.length > 0 || state.search.trim() !== '';
  const visibleRows = rows.slice(0, limit);
  const selectedRows = selectable ? rows.filter((r) => selected.has(getRowId(r))) : [];
  const openRow = openId ? rows.find((r) => getRowId(r) === openId) : undefined;
  const hasTotals = shown.some((c) => c.aggregate);
  const emptyText = loading ? 'Loading…' : filtering ? 'Nothing matches these filters.' : (emptyMessage ?? 'No results.');
  const allView: GridView = { id: 'all', name: 'All', filters: g.defaults.filters, sorting: g.defaults.sorting, search: '' };
  const chips = [allView, ...builtIn, ...g.saved];

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  function open(row: T) {
    if (selected.size > 0) return toggle(getRowId(row));
    if (useSheet) setOpenId(getRowId(row));
    else onRowClick?.(row);
  }

  return (
    <View>
      <Input value={state.search} onChangeText={g.setSearch} placeholder={props.searchPlaceholder ?? 'Search…'} autoCapitalize="none" autoCorrect={false} clearButtonMode="while-editing" style={{ marginBottom: 10 }} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 10 }} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
        <PillButton label="Filter" on={filterIds.length > 0} count={filterIds.length} onPress={() => setPanel('filter')} />
        <PillButton label={state.sorting[0] ? `Sort: ${columns.find((c) => c.id === state.sorting[0].id)?.title ?? ''} ${state.sorting[0].desc ? '↓' : '↑'}` : 'Sort'} on={state.sorting.length > 0 && state.sorting[0].id !== g.defaults.sorting[0]?.id} onPress={() => setPanel('sort')} />
        <PillButton label="View" onPress={() => setPanel('view')} />
        {filtering && <PillButton label="Reset ✕" onPress={g.clearFilters} />}
        {props.toolbarEnd}
      </ScrollView>

      {chips.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 10 }} contentContainerStyle={{ gap: 6 }} keyboardShouldPersistTaps="handled">
          {chips.map((v) => {
            const on = state.view === v.id;
            return (
              <Pressable key={v.id} onPress={() => { tap(); g.applyView(v); }} style={{ paddingVertical: 5, paddingHorizontal: 11, borderRadius: 14, borderWidth: 1, borderColor: on ? C.accent : C.line, backgroundColor: on ? '#4fcb6f24' : 'transparent' }}>
                <Text style={{ color: on ? C.accent : C.muted, fontSize: 12 }}>{v.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {filterIds.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {filterIds.map((id) => {
            const col = columns.find((c) => c.id === id)!;
            return (
              <Pressable key={id} onPress={() => g.setColumnFilter(id, undefined)} style={{ borderColor: '#4fcb6f59', backgroundColor: '#4fcb6f1a', borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text style={{ color: C.text, fontSize: 12 }}><Text style={{ color: C.accent, fontWeight: '700' }}>{col.title}</Text> {describeFilter(col.filter!, state.filters[id], col.format)} ✕</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Muted style={{ marginBottom: 8, fontSize: 12 }}>{filtering ? `${rows.length} of ${data.length} rows` : `${rows.length} row${rows.length === 1 ? '' : 's'}`}{selectedRows.length > 0 ? ` · ${selectedRows.length} selected` : ''}</Muted>

      {selectable && selectedRows.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: C.line, borderRadius: 6, backgroundColor: '#ffffff0d' }}>
          {bulkActions?.(selectedRows, () => setSelected(new Set()))}
          <Pressable onPress={() => setSelected(new Set())} style={{ marginLeft: 'auto' }}><Text style={{ color: C.muted }}>Clear</Text></Pressable>
        </View>
      )}

      {visibleRows.length === 0 && <Muted style={{ paddingVertical: 24, textAlign: 'center' }}>{emptyText}</Muted>}

      {visibleRows.map((row) => {
        const id = getRowId(row);
        const [lead, ...rest] = shown;
        const on = selected.has(id);
        return (
          <Pressable
            key={id}
            onPress={() => open(row)}
            onLongPress={selectable ? () => { tap(); toggle(id); } : undefined}
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: on ? C.accent : C.line, borderRadius: 6, backgroundColor: on ? '#4fcb6f14' : C.panel, opacity: props.dim?.(row) ? 0.5 : 1 }}>
            <View style={{ flex: 1, gap: 6 }}>
              {lead && <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>{renderLead(lead, row)}</View>}
              {rest.slice(0, 4).map((c) => (
                <View key={c.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <Text style={{ color: C.muted, fontSize: 12 }}>{c.title}</Text>
                  <View style={{ flexShrink: 1, alignItems: 'flex-end' }}>{renderCell(c, row)}</View>
                </View>
              ))}
            </View>
            {trailing?.(row)}
          </Pressable>
        );
      })}

      {rows.length > limit && (
        <Btn kind="ghost" label={`Show more (${rows.length - limit} left)`} onPress={() => setMore({ signature, limit: limit + state.pageSize })} style={{ marginTop: 4 }} />
      )}

      {hasTotals && rows.length > 0 && (
        <View style={{ marginTop: 10, padding: 12, borderWidth: 1, borderColor: C.line, borderRadius: 6, gap: 4 }}>
          <Text style={{ color: C.muted, fontSize: 10, letterSpacing: 1.8 }}>TOTAL · {rows.length} ROWS</Text>
          {shown.filter((c) => c.aggregate).map((c) => {
            const total = aggregateOf(rows, c);
            return (
              <View key={c.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: C.muted, fontSize: 13 }}>{c.title}</Text>
                <Text style={{ color: C.text, fontWeight: '700', fontSize: 13 }}>{total === null ? '—' : c.format ? c.format(total) : String(Math.round(total * 100) / 100)}</Text>
              </View>
            );
          })}
        </View>
      )}

      {panel === 'filter' && <FilterSheet grid={g} data={data} columns={columns} onClose={() => setPanel(null)} />}
      {panel === 'sort' && <SortSheet columns={columns} sorting={state.sorting} onChange={(sorting) => g.patch({ sorting })} onClose={() => setPanel(null)} />}
      {panel === 'view' && <ViewSheet grid={g} columns={columns} onClose={() => setPanel(null)} onExport={exportName !== undefined && rows.length > 0 ? () => void Share.share({ title: exportName, message: toCsv(selectedRows.length ? selectedRows : rows, shown) }) : undefined} />}

      {openRow && (
        <Sheet title={recordTitle(columns[0] as Col<T>, openRow)} onClose={() => setOpenId(null)}>
          {props.drawerTitle && <View style={{ marginBottom: 8 }}>{props.drawerTitle(openRow)}</View>}
          {orderedColumns(columns, state.order).map((c) => (
            <View key={c.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#ffffff0f' }}>
              <Text style={{ color: C.muted, fontSize: 12, flexShrink: 0 }}>{c.title}</Text>
              <View style={{ flexShrink: 1, alignItems: 'flex-end' }}>{renderCell(c as Col<T>, openRow)}</View>
            </View>
          ))}
          {props.drawerExtra?.(openRow)}
          <View style={{ gap: 8, marginTop: 16 }}>
            {onRowClick && <Btn label="Open" onPress={() => { setOpenId(null); onRowClick(openRow); }} />}
            {rowActions?.(openRow, () => setOpenId(null))}
          </View>
        </Sheet>
      )}
    </View>
  );
}

function renderLead<T>(col: Col<T>, row: T): ReactNode {
  if (col.cell) return col.cell(row);
  const raw = col.value(row);
  const text = col.format ? col.format(raw) : asText(raw);
  return <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>{text || '—'}</Text>;
}

function FilterSheet<T>({ grid, data, columns, onClose }: { grid: Grid; data: T[]; columns: GridColumnDef<T>[]; onClose: () => void }) {
  const [name, setName] = useState('');
  const filterable = columns.filter((c) => c.filter);
  return (
    <Sheet title="Filter" onClose={onClose}>
      {filterable.map((c) => {
        const meta = c.filter!;
        const value = grid.state.filters[c.id];
        const range = ((value as [string, string] | undefined) ?? ['', '']) as [string, string];
        return (
          <View key={c.id}>
            <Section>{c.title}</Section>
            {(meta.type === 'select' || meta.type === 'boolean') && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {facetOptions(data, columns, grid.state, c.id).map((o) => {
                  const chosen = ((value as string[] | undefined) ?? []).includes(o.value);
                  const current = (value as string[] | undefined) ?? [];
                  return (
                    <Pressable key={o.value} onPress={() => { tap(); grid.setColumnFilter(c.id, chosen ? current.filter((v) => v !== o.value) : [...current, o.value]); }} style={{ paddingVertical: 6, paddingHorizontal: 11, borderRadius: 6, borderWidth: 1, borderColor: chosen ? C.accent : C.input, backgroundColor: chosen ? '#4fcb6f24' : '#ffffff0d' }}>
                      <Text style={{ color: chosen ? C.accent : C.muted, fontSize: 13 }}>{o.label} <Text style={{ fontSize: 11 }}>{o.count}</Text></Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {meta.type === 'text' && <Input value={(value as string) ?? ''} onChangeText={(t) => grid.setColumnFilter(c.id, t)} placeholder={`${c.title} contains…`} autoCapitalize="none" />}
            {meta.type === 'number' && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Input style={{ flex: 1, minWidth: 0 }} value={range[0]} onChangeText={(t) => grid.setColumnFilter(c.id, [t, range[1]])} placeholder="From" keyboardType="numbers-and-punctuation" />
                <Input style={{ flex: 1, minWidth: 0 }} value={range[1]} onChangeText={(t) => grid.setColumnFilter(c.id, [range[0], t])} placeholder="To" keyboardType="numbers-and-punctuation" />
              </View>
            )}
            {meta.type === 'date' && (
              <View style={{ gap: 8 }}>
                <DateInput value={range[0]} onChange={(t) => grid.setColumnFilter(c.id, [t, range[1]])} placeholder="From YYYY-MM-DD" />
                <DateInput value={range[1]} onChange={(t) => grid.setColumnFilter(c.id, [range[0], t])} placeholder="To YYYY-MM-DD" />
              </View>
            )}
            {!isEmptyFilter(value) && <Pressable onPress={() => grid.setColumnFilter(c.id, undefined)} style={{ marginTop: 6 }}><Text style={{ color: C.accent, fontSize: 12 }}>Clear {c.title}</Text></Pressable>}
          </View>
        );
      })}
      <Section>Save this filter set</Section>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Input style={{ flex: 1, minWidth: 0 }} value={name} onChangeText={setName} placeholder="Name, e.g. Over ₹500" />
        <Btn kind="ghost" label="Save" disabled={!name.trim()} onPress={() => { grid.saveView(name.trim()); setName(''); }} />
      </View>
      {grid.saved.length > 0 && (
        <View style={{ marginTop: 10, gap: 6 }}>
          {grid.saved.map((v) => (
            <View key={v.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: C.text }}>{v.name}</Text>
              <Pressable hitSlop={8} onPress={() => grid.removeView(v.id)}><Text style={{ color: C.destructive }}>Delete</Text></Pressable>
            </View>
          ))}
        </View>
      )}
      <View style={{ marginTop: 18 }}>
        <Btn label="Done" onPress={onClose} />
      </View>
    </Sheet>
  );
}

function SortSheet<T>({ columns, sorting, onChange, onClose }: { columns: GridColumnDef<T>[]; sorting: SortState[]; onChange: (s: SortState[]) => void; onClose: () => void }) {
  return (
    <Sheet title="Sort by" onClose={onClose}>
      {columns.filter((c) => c.sortable !== false).map((c) => {
        const cur = sorting.find((x) => x.id === c.id);
        return (
          <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#ffffff0f' }}>
            <Text style={{ color: C.text, flex: 1 }}>{c.title}</Text>
            <PillButton label="↑ Asc" on={!!cur && !cur.desc} onPress={() => onChange(cur && !cur.desc ? [] : [{ id: c.id, desc: false }])} />
            <PillButton label="↓ Desc" on={!!cur?.desc} onPress={() => onChange(cur?.desc ? [] : [{ id: c.id, desc: true }])} />
          </View>
        );
      })}
      <View style={{ marginTop: 16 }}><Btn label="Done" onPress={onClose} /></View>
    </Sheet>
  );
}

function ViewSheet<T>({ grid, columns, onClose, onExport }: { grid: Grid; columns: GridColumnDef<T>[]; onClose: () => void; onExport?: () => void }) {
  const { state } = grid;
  const ordered = orderedColumns(columns, state.order);
  const move = (id: string, by: number) => {
    const ids = ordered.map((c) => c.id);
    const i = ids.indexOf(id);
    const j = i + by;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    grid.patch({ order: ids });
  };
  const visibleCount = ordered.filter((c) => !state.hidden[c.id]).length;
  return (
    <Sheet title="View" onClose={onClose}>
      <Section>Columns</Section>
      {ordered.map((c, i) => {
        const on = !state.hidden[c.id];
        return (
          <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#ffffff0f' }}>
            <Pressable onPress={() => { if (!on || visibleCount > 1) grid.patch({ hidden: { ...state.hidden, [c.id]: on } }); }} style={{ flex: 1, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <View style={{ width: 20, height: 20, borderWidth: 1, borderColor: on ? C.accent : C.input, backgroundColor: on ? C.accent : '#ffffff0d', borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>{on ? <Text style={{ color: C.accentFg, fontWeight: '800', fontSize: 12 }}>✓</Text> : null}</View>
              <Text style={{ color: on ? C.text : C.muted }}>{c.title}</Text>
            </Pressable>
            <Pressable hitSlop={8} disabled={i === 0} onPress={() => move(c.id, -1)}><Text style={{ color: i === 0 ? C.line : C.muted, fontSize: 16, paddingHorizontal: 6 }}>↑</Text></Pressable>
            <Pressable hitSlop={8} disabled={i === ordered.length - 1} onPress={() => move(c.id, 1)}><Text style={{ color: i === ordered.length - 1 ? C.line : C.muted, fontSize: 16, paddingHorizontal: 6 }}>↓</Text></Pressable>
          </View>
        );
      })}
      <Text style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>The first shown column is the card title; the next four are listed under it. Every column is in the record sheet.</Text>
      <View style={{ gap: 8, marginTop: 16 }}>
        {onExport && <Btn kind="ghost" label="Share as CSV" onPress={onExport} />}
        <Btn kind="ghost" label="Reset layout" onPress={() => { grid.resetLayout(); }} />
        <Btn label="Done" onPress={onClose} />
      </View>
    </Sheet>
  );
}

export { filterRows };

/** The record sheet's heading is plain text (the sheet's header is a string); the first column's value names the row. */
function recordTitle<T>(col: Col<T>, row: T): string {
  const raw = col.value(row);
  return (col.format ? col.format(raw) : asText(raw)) || 'Details';
}
