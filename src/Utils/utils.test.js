import { describe, expect, it } from 'vitest';
import { can, canField, gradeAtLeast, isFieldEditable, isFieldViewable } from './can';
import { transformDates } from './transformPayload';
import { WILAYA_OPTIONS, wilayaCode, wilayaLabel } from './wilayas';
import { toNumberFieldValue } from './numberField';

const loaded = {
  loaded: true,
  operations: { read: true, delete: false },
  canView: ['name', 'email'],
  canUpdate: ['name'],
  canCreate: [],
};

describe('can / canField (frontend view of backend permissions)', () => {
  it('nothing loaded yet is "unknown", never "allow"', () => {
    expect(can(null, 'read')).toBe('unknown');
    expect(can({ loaded: false, operations: { read: true } }, 'read')).toBe('unknown');
    expect(canField(undefined, 'view', 'name')).toBe('unknown');
  });

  it('operations: allow / deny / unknown when not shipped', () => {
    expect(can(loaded, 'read')).toBe('allow');
    expect(can(loaded, 'delete')).toBe('deny');
    expect(can(loaded, 'update')).toBe('unknown');
    expect(can({ loaded: true, operations: ['read'] }, 'read')).toBe('unknown');
    expect(can({ loaded: true, operations: { read: 'yes' } }, 'read')).toBe('unknown');
  });

  it('fields per mode; bad modes or names are unknown', () => {
    expect(canField(loaded, 'view', 'email')).toBe('allow');
    expect(canField(loaded, 'edit', 'email')).toBe('deny');
    expect(canField(loaded, 'create', 'name')).toBe('deny');
    expect(canField(loaded, 'delete', 'name')).toBe('unknown');
    expect(canField(loaded, 'view', '')).toBe('unknown');
    expect(canField({ loaded: true }, 'view', 'name')).toBe('unknown');
  });

  it('boolean shortcuts keep "unknown" as null', () => {
    expect(isFieldEditable(loaded, 'name')).toBe(true);
    expect(isFieldEditable(loaded, 'email')).toBe(false);
    expect(isFieldViewable(loaded, 'email')).toBe(true);
    expect(isFieldViewable(null, 'email')).toBeNull();
  });

  it.each([
    ['user', 'user', true],
    ['admin', 'user', true],
    ['super_admin', 'admin', true],
    ['user', 'admin', false],
    ['admin', 'super_admin', false],
    ['root', 'user', false],
    ['admin', 'root', false],
    ['constructor', 'user', false],
    [undefined, 'user', false],
  ])('gradeAtLeast(%s, %s) = %s', (grade, required, expected) => {
    expect(gradeAtLeast(grade, required)).toBe(expected);
  });
});

describe('transformDates', () => {
  it('turns bare dates into ISO midnight UTC, leaves the rest', () => {
    const out = transformDates({ dateOfBirth: '1990-04-02', startDate: '2026-01-01T10:00:00Z', name: '2020-01-01', dueDate: '' });
    expect(out).toEqual({ dateOfBirth: '1990-04-02T00:00:00.000Z', startDate: '2026-01-01T10:00:00Z', name: '2020-01-01', dueDate: '' });
  });

  it('a custom field list replaces the defaults; input is not mutated', () => {
    const input = { oathDate: '2020-05-05', dateOfBirth: '1990-04-02' };
    expect(transformDates(input, ['oathDate'])).toEqual({ oathDate: '2020-05-05T00:00:00.000Z', dateOfBirth: '1990-04-02' });
    expect(input.oathDate).toBe('2020-05-05');
  });
});

describe('wilayas', () => {
  it.each([
    ['05', '5'],
    ['25 - Constantine', '25'],
    ['25-Constantine', '25'],
    ['Batna', '5'],
    ['béjaïa', '6'],
    ['  16  ', '16'],
    ['Atlantis', 'Atlantis'],
  ])('wilayaCode(%s) = %s', (input, expected) => {
    expect(wilayaCode(input)).toBe(expected);
  });

  it('labels and options', () => {
    expect(wilayaLabel('16')).toBe('16 - Alger');
    expect(wilayaLabel('Atlantis')).toBe('Atlantis');
    expect(wilayaLabel('', 'n/a')).toBe('n/a');
    expect(wilayaCode(null)).toBeNull();
    expect(WILAYA_OPTIONS.length).toBeGreaterThanOrEqual(48);
    expect(WILAYA_OPTIONS[0]).toEqual({ value: expect.any(String), label: expect.stringMatching(/^\d+ - /) });
  });
});

describe('toNumberFieldValue', () => {
  it('sends exact numbers as numbers, empty as null', () => {
    expect(toNumberFieldValue('42')).toBe(42);
    expect(toNumberFieldValue('2.5')).toBe(2.5);
    expect(toNumberFieldValue('')).toBeNull();
    expect(toNumberFieldValue(undefined)).toBeNull();
  });

  it('regression: keeps an 18-digit NIN as text instead of rounding it', () => {
    expect(String(Number('109870887110123457'))).toBe('109870887110123460'); // what used to be sent
    expect(toNumberFieldValue('109870887110123457')).toBe('109870887110123457');
  });
});
