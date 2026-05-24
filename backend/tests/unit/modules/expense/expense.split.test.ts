import { computeShares } from "../../../../src/modules/expense/expense.service";

function shareValues(shares: Map<string, number>, userIds: string[]) {
  return userIds.map((userId) => shares.get(userId) ?? 0);
}

function shareSum(shares: Map<string, number>) {
  return Array.from(shares.values()).reduce((sum, share) => sum + share, 0);
}

describe("expense percent split rounding", () => {
  it("amount 100 split by 33/33/34 sums to 100", () => {
    const shares = computeShares(100, "percent", [
      { userId: "a", value: 33 },
      { userId: "b", value: 33 },
      { userId: "c", value: 34 },
    ]);

    expect(shareSum(shares)).toBe(100);
  });

  it("amount 1 split percent does not lose or create money", () => {
    const shares = computeShares(1, "percent", [
      { userId: "a", value: 33 },
      { userId: "b", value: 33 },
      { userId: "c", value: 34 },
    ]);

    expect(shareSum(shares)).toBe(1);
  });

  it("invalid percent total is rejected", () => {
    expect(() =>
      computeShares(100, "percent", [
        { userId: "a", value: 50 },
        { userId: "b", value: 49 },
      ]),
    ).toThrow("must equal 100");
  });

  it("repeated calculation is deterministic", () => {
    const participants = [
      { userId: "a", value: 33 },
      { userId: "b", value: 33 },
      { userId: "c", value: 34 },
    ];

    const first = computeShares(1, "percent", participants);
    const second = computeShares(1, "percent", participants);

    expect(shareValues(first, ["a", "b", "c"])).toEqual([1, 0, 0]);
    expect(shareValues(second, ["a", "b", "c"])).toEqual([1, 0, 0]);
  });

  it("rejects zero or negative percent values", () => {
    expect(() =>
      computeShares(100, "percent", [
        { userId: "a", value: 100 },
        { userId: "b", value: 0 },
      ]),
    ).toThrow("greater than 0");
  });
});
