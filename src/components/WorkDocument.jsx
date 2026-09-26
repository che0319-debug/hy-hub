import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Read-only presentation: copy/edit actions continue to use the original source.
// Raw HTML is ignored and react-markdown retains its default safe URL handling.
const components = {
  a: ({ children, href }) => href
    ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
    : <span>{children}</span>,
  img: ({ src, alt }) => src
    ? <a href={src} target="_blank" rel="noopener noreferrer">{alt || '查看圖片'}</a>
    : <span>{alt}</span>,
  table: ({ children }) => <div className="pilot-document-table" tabIndex={0} role="region" aria-label="文件表格"><table>{children}</table></div>,
}

export default function WorkDocument({ children }) {
  return <div className="pilot-document">
    <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={components}>{children || ''}</ReactMarkdown>
  </div>
}
