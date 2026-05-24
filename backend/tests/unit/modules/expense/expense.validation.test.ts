import { computeShares } from '@/modules/expense/expense.service';

describe('expense.service computeShares validation', () => {
  test('throws when participants empty', () => {
    expect(() => computeShares(100, 'equal', [])).toThrow();
  });

  test('amount mode validates total equals amount', () => {
    expect(() =>
      computeShares(100, 'amount', [
        { userId: 'u1', value: 40 },
        { userId: 'u2', value: 50 },
      ]),
    ).toThrow();
  });

  test('percent mode rejects non-positive percent', () => {
    expect(() =>
      computeShares(100, 'percent', [
        { userId: 'u1', value: 0 },
        { userId: 'u2', value: 100 },
      ]),
    ).toThrow();
  });

  test('percent mode rejects total not 100', () => {
    expect(() =>
      computeShares(100, 'percent', [
        { userId: 'u1', value: 70 },
        { userId: 'u2', value: 20 },
      ]),
    ).toThrow();
  });

  test('weight mode rejects non-positive total', () => {
    expect(() =>
      computeShares(100, 'weight', [
        { userId: 'u1', value: 0 },
        { userId: 'u2', value: 0 },
      ]),
    ).toThrow();
  });

  test('throws on unknown split mode', () => {
    expect(() =>
      computeShares(100, 'invalid', [
        { userId: 'u1', value: 1 },
      ]),
    ).toThrow();
  });
});
