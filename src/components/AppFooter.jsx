import { Link } from 'react-router-dom';

// Trust & branding footer for the live/dashboard analysis views.
export default function AppFooter() {
  return (
    <footer style={{
      textAlign: 'center', padding: '40px 20px', background: 'rgba(11, 15, 25, 0.95)',
      color: '#94a3b8', fontSize: '0.85rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px', color: '#00f5a0', fontWeight: 600,
        background: 'rgba(0, 245, 160, 0.08)', padding: '8px 16px', borderRadius: '20px',
        border: '1px solid rgba(0, 245, 160, 0.2)',
      }}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" /></svg>
        <span>Video never leaves your device — only anonymous joint coordinates are sent for scoring.</span>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '4px' }}>
        <Link to="/privacy" className="footer-link-btn" style={{ textDecoration: 'none' }}>Privacy Policy</Link>
        <span style={{ color: '#475569' }}>|</span>
        <Link to="/contact" className="footer-link-btn" style={{ textDecoration: 'none' }}>Contact &amp; Feedback</Link>
        <span style={{ color: '#475569' }}>|</span>
        <span style={{ color: '#64748b' }}>App Version 1.1.0</span>
      </div>

      <div style={{ marginTop: '8px', color: '#64748b', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
        <span>Engineered by </span>
        <span style={{ color: '#f8fafc', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>BILAL HASAN</span>
        <span style={{ margin: '0 10px', opacity: 0.3 }}>|</span>
        <span>© 2026 Bilal Hasan</span>
      </div>
    </footer>
  );
}
