import { collectionRef, collectionNames, getQuery, paginate, AppUser, PublicUser } from "../../lib/firestore-db";

export async function searchUsers(q: string | undefined, page = 1, limit = 20, excludeUserId?: string) {
  const query = (q || "").toLowerCase().trim();

  const all = await getQuery<AppUser>(collectionRef(collectionNames.users));

  const matched = all.filter((u) => {
    if (excludeUserId && u.id === excludeUserId) return false;
    if (!query) return true;
    const email = u.email ?? "";
    const display = u.displayName ?? "";
    return (
      email.toLowerCase().includes(query) ||
      display.toLowerCase().includes(query)
    );
  });

  const publicUsers: PublicUser[] = matched.map((u) => ({
    id: u.id,
    displayName: u.displayName,
    email: u.email,
    avatarUrl: u.avatarUrl,
  }));

  const paged = paginate(publicUsers, page, limit);
  return paged;
}

export default {};
