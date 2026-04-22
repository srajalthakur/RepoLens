import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Archive, Download, CheckSquare, Square, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const DOC_ORDER = [
  { type: 'OVERVIEW',     label: 'Project Overview'      },
  { type: 'SPEC',         label: 'Reverse Engineer Spec' },
  { type: 'ARCHITECTURE', label: 'System Architecture'   },
  { type: 'TECHSTACK',    label: 'Tech Stack Breakdown'  },
  { type: 'DATABASE',     label: 'Database Schema'       },
  { type: 'API',          label: 'API Reference'         },
  { type: 'SETUP',        label: 'Developer Setup Guide' },
  { type: 'DEPLOYMENT',   label: 'Deployment Guide'      },
];

async function parseBlobError(err) {
  try {
    if (err.response?.data instanceof Blob) {
      const text = await err.response.data.text();
      try { return JSON.parse(text)?.error || JSON.parse(text)?.message || text; } catch { return text; }
    }
    return err.response?.data?.error || err.response?.data?.message || err.message || 'Export failed';
  } catch {
    return err.message || 'Export failed';
  }
}

export default function PdfModal({ jobId, completedTypes, onClose }) {
  const available  = DOC_ORDER.filter((d) => completedTypes.includes(d.type));
  const [selected, setSelected]   = useState(new Set(available.map((d) => d.type)));
  const [pdfLoading, setPdfLoading] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const [pdfError,   setPdfError]   = useState(null);

  const toggle    = (type) => setSelected((p) => { const n = new Set(p); n.has(type) ? n.delete(type) : n.add(type); return n; });
  const toggleAll = () => setSelected(
    selected.size === available.length ? new Set() : new Set(available.map((d) => d.type))
  );

  /* ── PDF download — passes selected types as query params ── */
  const downloadPdf = async () => {
    if (selected.size === 0) return;
    setPdfLoading(true);
    setPdfError(null);
    try {
      // FIX: pass selected types so the backend only renders chosen docs
      const typesParam = Array.from(selected).join(',');
      const res = await api.get(`/api/export/${jobId}/pdf?types=${typesParam}`, {
        responseType: 'blob',
        timeout: 90000, // Puppeteer on free tier — give it 90s
      });

      const contentType = res.headers?.['content-type'] || '';
      if (!contentType.includes('pdf')) {
        const text = await res.data.text();
        throw new Error(text.slice(0, 200));
      }

      const url  = URL.createObjectURL(res.data);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `repolens-${jobId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (err) {
      const msg = await parseBlobError(err);
      setPdfError(msg);
    } finally {
      setPdfLoading(false);
    }
  };

  /* ── ZIP download ── */
  const downloadZip = async () => {
    setZipLoading(true);
    try {
      const res = await api.get(`/api/export/${jobId}/zip`, {
        responseType: 'blob',
        timeout: 60000,
      });
      const url  = URL.createObjectURL(res.data);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `repolens-${jobId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('ZIP downloaded');
    } catch (err) {
      const msg = await parseBlobError(err);
      toast.error(`ZIP failed: ${msg}`);
    } finally {
      setZipLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="pdf-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(22,22,20,0.82)',
          backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}
      >
        <motion.div
          key="pdf-panel"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit={{   opacity: 0, scale: 0.95, y: 10  }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-hover)',
            borderRadius: 16, overflow: 'hidden',
            width: '100%', maxWidth: 400,
            boxShadow: '0 32px 72px rgba(0,0,0,0.65)',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '15px 20px', borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileText size={15} style={{ color: 'var(--accent)' }} />
              <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                Export Documentation
              </span>
            </div>
            <button
              onClick={onClose}
              style={{ padding: 6, borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Doc selection */}
          <div style={{ padding: '12px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <p style={{ fontFamily: '"DM Mono",monospace', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Select documents for PDF
              </p>
              <button
                onClick={toggleAll}
                style={{ fontFamily: '"DM Mono",monospace', fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {selected.size === available.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 240, overflowY: 'auto' }}>
              {available.map(({ type, label }) => {
                const checked = selected.has(type);
                return (
                  <button
                    key={type}
                    onClick={() => toggle(type)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', borderRadius: 8, border: 'none',
                      background: checked ? 'rgba(228,91,17,0.07)' : 'transparent',
                      cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s',
                    }}
                    onMouseEnter={(e) => { if (!checked) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = checked ? 'rgba(228,91,17,0.07)' : 'transparent'; }}
                  >
                    {checked
                      ? <CheckSquare size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                      : <Square      size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    }
                    <span style={{ fontFamily: '"DM Mono",monospace', fontSize: 12, color: checked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PDF error banner */}
          {pdfError && (
            <div style={{
              margin: '0 20px 10px', padding: '10px 12px', borderRadius: 8,
              background: 'rgba(228,91,17,0.08)', border: '1px solid rgba(228,91,17,0.25)',
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <AlertCircle size={13} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontFamily: '"DM Mono",monospace', fontSize: 11, color: 'var(--accent)', marginBottom: 2 }}>
                  PDF export failed
                </p>
                <p style={{ fontFamily: '"DM Mono",monospace', fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {pdfError.length > 120 ? pdfError.slice(0, 120) + '…' : pdfError}
                </p>
                <p style={{ fontFamily: '"DM Mono",monospace', fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                  Try the ZIP export — it contains all docs as Markdown files.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ padding: '12px 20px 16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* PDF */}
            <button
              onClick={downloadPdf}
              disabled={pdfLoading || selected.size === 0}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '11px 16px', borderRadius: 9, border: 'none',
                background: selected.size > 0 ? 'var(--accent)' : 'var(--bg-elevated)',
                color: selected.size > 0 ? 'white' : 'var(--text-muted)',
                fontFamily: '"DM Mono",monospace', fontSize: 12, fontWeight: 500,
                cursor: selected.size > 0 && !pdfLoading ? 'pointer' : 'default',
                opacity: pdfLoading ? 0.65 : 1, transition: 'all 0.15s',
              }}
            >
              <Download size={13} />
              {pdfLoading
                ? 'Generating PDF… (may take 30–60s)'
                : `Download PDF (${selected.size} doc${selected.size !== 1 ? 's' : ''})`
              }
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontFamily: '"DM Mono",monospace', fontSize: 10, color: 'var(--text-muted)' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            {/* ZIP */}
            <button
              onClick={downloadZip}
              disabled={zipLoading}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '11px 16px', borderRadius: 9,
                border: '1px solid var(--border)', background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
                fontFamily: '"DM Mono",monospace', fontSize: 12,
                cursor: zipLoading ? 'default' : 'pointer',
                opacity: zipLoading ? 0.65 : 1, transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { if (!zipLoading) { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-hover)'; } }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <Archive size={13} />
              {zipLoading ? 'Zipping…' : 'Download All as ZIP (Markdown)'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
