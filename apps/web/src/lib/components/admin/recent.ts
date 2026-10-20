export interface RecentUser {
  id: number;
  username: string;
  group: { name: string; colour: string };
}

const KEY = 'soumetsu.admin.recent';

// Kept in this browser only, for the search's "Recently opened" list.
export function recentUsers(): RecentUser[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function rememberUser(user: RecentUser) {
  try {
    const list = [user, ...recentUsers().filter((u) => u.id !== user.id)].slice(0, 5);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage is blocked, so the list just stays empty.
  }
}
