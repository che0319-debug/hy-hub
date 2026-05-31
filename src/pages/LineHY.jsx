export default function LineHY() {
  return (
    <div style={{ margin: "-1.5rem", height: "calc(100vh - 3rem)" }}>
      <iframe
        src={`${import.meta.env.BASE_URL}personal-dashboard.html`}
        title="HY 個人控制中心"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </div>
  )
}
