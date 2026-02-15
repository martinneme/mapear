export type SessionUser = { id: string; email: string; globalRole: "ANALYST" | "SUBSCRIBER" };

export function readUserFromStorage(): SessionUser | null {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  return readUserFromStorage();
}
