import axiosClient from "./axiosClient";

export const groupApi = {
  getAll: () => axiosClient.get("/api"),
  create: (data: any) => axiosClient.post("/groups", data),
  getById: (id: string) => axiosClient.get(`/groups/${id}`),
};
