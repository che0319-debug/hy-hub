const API_BASE = import.meta.env.VITE_API_BASE || "";
const READ_SECRET = import.meta.env.VITE_READ_SECRET || "";

export async function fetchPersonalData() {
  const res = await fetch(`${API_BASE}/api/personal-data`, {
    method: "GET",
    headers: { "X-Read-Secret": READ_SECRET },
  });
  if (!res.ok) {
    throw new Error(`fetchPersonalData failed: ${res.status}`);
  }
  return res.json();
}
