import { apiClient } from "../client";
import { ENDPOINTS } from "../endpoints";

export async function listFriends() {
  const res = await apiClient.get(ENDPOINTS.FRIENDS.LIST);
  return res.data.data as any[];
}

export async function listIncomingRequests() {
  const res = await apiClient.get(ENDPOINTS.FRIENDS.REQUESTS);
  return res.data.data as any[];
}

export async function sendFriendRequest(email: string) {
  const res = await apiClient.post(ENDPOINTS.FRIENDS.SEND, { email });
  return res.data.data;
}

export async function acceptFriendRequest(requestId: string) {
  const res = await apiClient.post(ENDPOINTS.FRIENDS.ACCEPT(requestId));
  return res.data.data;
}

export async function rejectFriendRequest(requestId: string) {
  const res = await apiClient.delete(ENDPOINTS.FRIENDS.REJECT(requestId));
  return res.data.data;
}

export default { listFriends, listIncomingRequests, sendFriendRequest, acceptFriendRequest };
