import type { Row } from '@tanstack/react-table';
import { describe, expect, it } from 'vitest';

import {
  containsFilter,
  dateRangeFilter,
  describeFilter,
  filterFnFor,
  humanize,
  inSetFilter,
  numberRangeFilter,
} from './column-utils';

/** A stand-in for a TanStack row that only knows how to hand back one value. */
const rowOf = (value: unknown) => ({ getValue: () => value }) as unknown as Row<unknown>;
const run = (fn: typeof inSetFilter, value: unknown, filter: unknown) => fn(rowOf(value), 'col', filter, () => {});

describe('humanize', () => {
  it('turns camelCase and snake_case ids into readable names', () => {
    expect(humanize('currentBalance')).toBe('Current balance');
    expect(humanize('account_type')).toBe('Account type');
    expect(humanize('isPrimary')).toBe('Is primary');
    expect(humanize('id')).toBe('Id');
  });
});

describe('filters', () => {
  it('select matches any chosen value and treats an empty choice as no filter', () => {
    expect(run(inSetFilter, 'Savings', ['Savings', 'Cash'])).toBe(true);
    expect(run(inSetFilter, 'Credit card', ['Savings', 'Cash'])).toBe(false);
    expect(run(inSetFilter, 'anything', [])).toBe(true);
  });

  it('select matches an array cell on any of its items, and booleans by their string form', () => {
    expect(run(inSetFilter, ['food', 'travel'], ['travel'])).toBe(true);
    expect(run(inSetFilter, ['food'], ['travel'])).toBe(false);
    expect(run(inSetFilter, true, ['true'])).toBe(true);
    expect(run(inSetFilter, false, ['true'])).toBe(false);
  });

  it('number range is inclusive and either end may be open', () => {
    expect(run(numberRangeFilter, 100, ['100', '200'])).toBe(true);
    expect(run(numberRangeFilter, 201, ['100', '200'])).toBe(false);
    expect(run(numberRangeFilter, 5, ['', '10'])).toBe(true);
    expect(run(numberRangeFilter, 500, ['100', ''])).toBe(true);
    expect(run(numberRangeFilter, 'n/a', ['1', '2'])).toBe(false);
    expect(run(numberRangeFilter, -50, ['-100', '0'])).toBe(true);
  });

  it('date range compares days, accepts full timestamps, and either end may be open', () => {
    expect(run(dateRangeFilter, '2026-09-30T18:31:00Z', ['2026-09-30', '2026-09-30'])).toBe(true);
    expect(run(dateRangeFilter, '2026-09-29', ['2026-09-30', ''])).toBe(false);
    expect(run(dateRangeFilter, '2026-10-05', ['', '2026-10-01'])).toBe(false);
    expect(run(dateRangeFilter, null, ['2026-09-01', ''])).toBe(false);
    expect(run(dateRangeFilter, null, ['', ''])).toBe(true);
  });

  it('text filter is a case-insensitive contains', () => {
    expect(run(containsFilter, 'HDFC Savings', 'hdfc')).toBe(true);
    expect(run(containsFilter, 'Canara', 'hdfc')).toBe(false);
  });

  it('each filter type maps to the right function', () => {
    expect(filterFnFor({ type: 'select' })).toBe('inSet');
    expect(filterFnFor({ type: 'boolean' })).toBe('inSet');
    expect(filterFnFor({ type: 'date' })).toBe('dateRange');
    expect(filterFnFor({ type: 'number' })).toBe('numberRange');
    expect(filterFnFor({ type: 'text' })).toBe('contains');
  });
});

describe('describeFilter', () => {
  it('summarises each kind for the chips', () => {
    expect(describeFilter({ type: 'select' }, ['Savings'])).toBe('Savings');
    expect(describeFilter({ type: 'select' }, ['a', 'b', 'c'])).toBe('3 selected');
    expect(describeFilter({ type: 'boolean', labels: ['Active', 'Inactive'] }, ['false'])).toBe('Inactive');
    expect(describeFilter({ type: 'number' }, ['10', '20'])).toBe('10 - 20');
    expect(describeFilter({ type: 'number' }, ['10', ''])).toBe('from 10');
    expect(describeFilter({ type: 'date' }, ['', '2026-10-01'])).toBe('up to 2026-10-01');
    expect(describeFilter({ type: 'text' }, 'swiggy')).toBe('contains "swiggy"');
  });

  it('uses the option labels and a custom formatter when given', () => {
    expect(describeFilter({ type: 'select', options: [{ value: 'over', label: 'Over budget' }] }, ['over'])).toBe('Over budget');
    expect(describeFilter({ type: 'number' }, ['1000', '2000'], (v) => `₹${v}`)).toBe('₹1000 - ₹2000');
  });
});
