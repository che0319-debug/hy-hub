export default function LineFamily() {
  return (
    <div style={{ margin: "-1.5rem", height: "calc(100vh - 3rem)" }}>
      <iframe
        src={`${import.meta.env.BASE_URL}family-dashboard.html`}
        title="家庭 / 小因管家"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </div>
  )
}
