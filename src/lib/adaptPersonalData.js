export function adaptPersonalData(data) {
  return {
    botId: "hy",
    columns: (data.projects || []).map(p => ({
      id: p.id,
      name: p.name,
      color: p.color || "#94a3b8",
      items: (p.milestones || []).map(m => ({
        id: `hy-${m.id}`,
        title: m.title,
        desc: m.description || "",
        due: m.due || "",
      })),
    })),
  };
}
