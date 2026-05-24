import { ENDPOINTS } from "@/api/endpoints";

describe("ENDPOINTS", () => {
  it("defines auth routes", () => {
    expect(ENDPOINTS.AUTH.LOGIN).toBe("/auth/login");
    expect(ENDPOINTS.AUTH.SYNC).toBe("/auth/sync");
  });

  it("builds dynamic group routes", () => {
    expect(ENDPOINTS.GROUPS.DETAIL("g1")).toBe("/groups/g1");
    expect(ENDPOINTS.GROUPS.EXPENSES("g1")).toBe("/groups/g1/expenses");
    expect(ENDPOINTS.GROUPS.MEMBER_DETAIL("g1", "u1")).toBe(
      "/groups/g1/members/u1",
    );
    expect(ENDPOINTS.FRIENDS.ACCEPT("req-1")).toBe("/friends/req-1/accept");
  });
});
