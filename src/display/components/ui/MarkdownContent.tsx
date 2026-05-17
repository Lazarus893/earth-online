import ReactMarkdown from 'react-markdown'

export default function MarkdownContent({ content, className = '' }: { content: string; className?: string }) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
