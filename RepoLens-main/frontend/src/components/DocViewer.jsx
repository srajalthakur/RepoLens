import { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { AnimatePresence, motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import DiagramCard from './MermaidDiagram';

const DIAGRAM_TYPES  = new Set(['ARCHITECTURE', 'DATABASE']);
const DIAGRAM_LABELS = { ARCHITECTURE: 'Architecture Diagram', DATABASE: 'Database Schema' };

/* Extract mermaid block from markdown */
function extractMermaid(content) {
  const match = content.match(/```mermaid\n([\s\S]+?)```/);
  return {
    mermaidCode:  match?.[1]?.trim() ?? null,
    markdownBody: match ? content.replace(/```mermaid\n[\s\S]+?```/, '') : content,
  };
}

/* Syntax-highlighted code block */
function CodeBlock({ inline, className, children, ...props }) {
  const lang = /language-(\w+)/.exec(className || '')?.[1];
  if (!inline && lang) {
    return (
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={lang}
        PreTag="div"
        customStyle={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 8, fontSize: 12,
          fontFamily: '"DM Mono",monospace', margin: 0,
        }}
        codeTagProps={{ style: { fontFamily: '"DM Mono",monospace' } }}
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    );
  }
  return <code className={className} {...props}>{children}</code>;
}

/* Copy button that resets after 2s */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy document"
      style={{
        position: 'absolute', top: 16, right: 16,
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 10px', borderRadius: 7,
        border: '1px solid var(--border)',
        background: copied ? 'rgba(248,171,11,0.1)' : 'var(--bg-elevated)',
        color: copied ? '#F8AB0B' : 'var(--text-muted)',
        fontFamily: '"DM Mono",monospace', fontSize: 11,
        cursor: 'pointer', transition: 'all 0.15s', zIndex: 2,
      }}
      onMouseEnter={(e) => { if (!copied) { e.currentTarget.style.color='var(--text-primary)'; e.currentTarget.style.borderColor='var(--border-hover)'; } }}
      onMouseLeave={(e) => { if (!copied) { e.currentTarget.style.color='var(--text-muted)'; e.currentTarget.style.borderColor='var(--border)'; } }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

/* ── Main DocViewer ──────────────────────────────────────────────────── */
export default function DocViewer({ docs, activeTab }) {
  const scrollRef  = useRef(null);
  const content    = activeTab ? docs[activeTab] : null;
  const hasDiagram = DIAGRAM_TYPES.has(activeTab);

  const { mermaidCode, markdownBody } = content
    ? extractMermaid(content)
    : { mermaidCode: null, markdownBody: '' };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [activeTab]);

  if (!activeTab || !content) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', fontFamily: '"DM Mono",monospace', fontSize: 12,
      }}>
        Select a document from the sidebar
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)', position: 'relative' }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{ maxWidth: 760, margin: '0 auto', padding: '36px 32px 64px', position: 'relative' }}
        >
          {/* Copy button — top right */}
          <CopyButton text={content} />

          {/* Diagram card (replaces inline mermaid) */}
          {hasDiagram && mermaidCode && (
            <div style={{ marginBottom: 32 }}>
              <DiagramCard
                code={mermaidCode}
                label={DIAGRAM_LABELS[activeTab]}
              />
            </div>
          )}

          {/* Markdown body */}
          <div className="prose">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{ code: CodeBlock }}
            >
              {markdownBody}
            </ReactMarkdown>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
