import { Link } from 'react-router-dom'

export default function Line950157() {
  return (
    <div className="line-frame">
      <div style={{ padding: "6px 12px", minHeight: 44, alignItems: "center", background: "white", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
        <Link to="/agent/950157" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#64748b", textDecoration: "none" }}>
          ⚙ 人設
        </Link>
      </div>
      <iframe
        src={`${import.meta.env.BASE_URL}950157-dashboard.html`}
        title="950157 工作控制中心"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </div>
  )
}
