import { describe, expect, it } from 'vitest';

import { aggregateOf, applyView, csvCell, cycleSort, defaultState, describeFilter, facetOptions, filterRows, restoreLayout, runGrid, setFilter, sortRows, toCsv, visibleColumns, type GridColumnDef } from './index';

interface Row { id: string; name: string; status: string; amount: number | null; date: string; tags: string[] }
const rows: Row[] = [
  { id: '1', name: 'Rent', status: 'Paid', amount: 1200, date: '2026-01-05', tags: ['home'] },
  { id: '2', name: 'Coffee', status: 'Pending', amount: 4.5, date: '2026-02-10', tags: ['food', 'daily'] },
  { id: '3', name: 'Gym', status: 'Paid', amount: null, date: '2026-03-01', tags: [] },
  { id: '4', name: 'Books', status: 'Failed', amount: 30, date: '2026-03-15', tags: ['daily'] },
];
const cols: GridColumnDef<Row>[] = [
  { id: 'name', title: 'Name', value: (r) => r.name, filter: { type: 'text' } },
  { id: 'status', title: 'Status', value: (r) => r.status, filter: { type: 'select' } },
  { id: 'amount', title: 'Amount', value: (r) => r.amount, filter: { type: 'number' }, aggregate: 'sum', align: 'right' },
  { id: 'date', title: 'Date', value: (r) => r.date, filter: { type: 'date' } },
  { id: 'tags', title: 'Tags', value: (r) => r.tags, filter: { type: 'select' }, hidden: true },
];
const state = (over = {}) => defaultState(cols, over);
const ids = (rs: Row[]) => rs.map((r) => r.id);

describe('filterRows', () => {
  it('searches across columns', () => expect(ids(filterRows(rows, cols, state({ search: 'coff' })))).toEqual(['2']));
  it('filters select columns, including array cells', () => {
    expect(ids(filterRows(rows, cols, state({ filters: { status: ['Paid'] } })))).toEqual(['1', '3']);
    expect(ids(filterRows(rows, cols, state({ filters: { tags: ['daily'] } })))).toEqual(['2', '4']);
  });
  it('filters number and date ranges, either end open', () => {
    expect(ids(filterRows(rows, cols, state({ filters: { amount: ['10', ''] } })))).toEqual(['1', '4']);
    expect(ids(filterRows(rows, cols, state({ filters: { date: ['2026-02-01', '2026-03-01'] } })))).toEqual(['2', '3']);
  });
  it('treats empty filters as no filter', () => expect(filterRows(rows, cols, state({ filters: { status: [], amount: ['', ''] } }))).toBe(rows));
});

describe('sortRows', () => {
  it('sorts numbers and keeps blanks last either way', () => {
    expect(ids(sortRows(rows, cols, [{ id: 'amount', desc: false }]))).toEqual(['2', '4', '1', '3']);
    expect(ids(sortRows(rows, cols, [{ id: 'amount', desc: true }]))).toEqual(['1', '4', '2', '3']);
  });
  it('breaks ties with the next sort', () => expect(ids(sortRows(rows, cols, [{ id: 'status', desc: false }, { id: 'name', desc: true }]))).toEqual(['4', '1', '3', '2']));
});

describe('helpers', () => {
  it('cycles a header sort asc -> desc -> off', () => {
    const a = cycleSort([], 'name');
    const b = cycleSort(a, 'name');
    expect([a, b, cycleSort(b, 'name')]).toEqual([[{ id: 'name', desc: false }], [{ id: 'name', desc: true }], []]);
  });
  it('drops a filter set to nothing', () => expect(setFilter({ a: ['x'] }, 'a', [])).toEqual({}));
  it('counts facets without the column own filter', () => {
    const opts = facetOptions(rows, cols, state({ filters: { status: ['Failed'] } }), 'status');
    expect(opts.find((o) => o.value === 'Paid')?.count).toBe(2);
  });
  it('totals a column over the rows given', () => expect(aggregateOf(rows, cols[2])).toBe(1234.5));
  it('pages the sorted rows', () => {
    const r = runGrid(rows, cols, state({ pageSize: 3, page: 1 }));
    expect([ids(r.pageRows), r.pages]).toEqual([['4'], 2]);
  });
  it('writes CSV with escaping and export values', () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(toCsv(rows.slice(0, 1), [cols[0], { ...cols[2], exportValue: (r) => `₹${r.amount}` }])).toBe('Name,Amount\nRent,₹1200');
  });
  it('describes filters for chips', () => {
    expect(describeFilter({ type: 'number' }, ['5', ''])).toBe('from 5');
    expect(describeFilter({ type: 'select' }, ['a', 'b', 'c'])).toBe('3 selected');
  });
  it('hides columns and honours order', () => {
    expect(visibleColumns(cols, state({ order: ['status', 'name'] })).map((c) => c.id)).toEqual(['status', 'name', 'amount', 'date']);
  });
  it('restores a saved layout and ignores columns that no longer exist', () => {
    const next = restoreLayout(cols, state(), { sorting: [{ id: 'gone', desc: true }, { id: 'name', desc: true }], hidden: { amount: true, gone: true }, pageSize: 50 });
    expect([next.sorting, next.hidden, next.pageSize]).toEqual([[{ id: 'name', desc: true }], { amount: true }, 50]);
  });
  it('applies a view over the defaults', () => {
    const base = state();
    const next = applyView(state({ search: 'x', page: 3 }), { id: 'v', name: 'Paid', filters: { status: ['Paid'] } }, base);
    expect([next.view, next.search, next.page, next.filters]).toEqual(['v', '', 0, { status: ['Paid'] }]);
  });
});
