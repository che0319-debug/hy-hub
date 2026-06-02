import { Link } from 'react-router-dom'

export default function LineFamily() {
  return (
    <div style={{ margin: "-1.5rem", height: "calc(100vh - 3rem)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "4px 12px", background: "white", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
        <Link to="/agent/xiaoyin" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#64748b", textDecoration: "none" }}>
          ⚙ 人設
        </Link>
      </div>
      <iframe
        src={`${import.meta.env.BASE_URL}family-dashboard.html`}
        title="家庭 / 小因管家"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </div>
  )
}
