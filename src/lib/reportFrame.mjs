// srcdoc otherwise resolves fragment links against the host app's URL.
// This fixed base keeps report chapter links inside the sandboxed document.
export function reportFrameHtml(html) {
  if (!html) return ''
  const base = '<base href="about:srcdoc">'
  if (/<head(?:\s[^>]*)?>/i.test(html)) {
    return html.replace(/<head(?:\s[^>]*)?>/i, match => match + base)
  }
  return html.replace(/^(\s*<!doctype[^>]*>)?/i, match => match + base)
}
