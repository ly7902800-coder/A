export interface MemoryItem {
  id: string;
  userId: string;
  text: string;
  tags: string[];
  createdAt: string;
}

const store = new Map<string, MemoryItem[]>();

export function addMemory(item: Omit<MemoryItem, "createdAt">): MemoryItem {
  const value = { ...item, createdAt: new Date().toISOString() };
  store.set(item.userId, [...(store.get(item.userId) ?? []), value]);
  return value;
}

export function listMemories(userId: string): MemoryItem[] {
  return [...(store.get(userId) ?? [])];
}

export function deleteMemory(userId: string, id: string): boolean {
  const current = store.get(userId) ?? [];
  const next = current.filter((item) => item.id !== id);
  store.set(userId, next);
  return next.length !== current.length;
}
