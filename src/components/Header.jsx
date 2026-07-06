import { useNavigate, useLocation } from 'react-router-dom';

// Single nav button — hover styling lives in App.css (.app-nav-btn:hover) so it
// survives the cursor entering child <svg>/<span> nodes, unlike JS onMouseEnter.
function NavButton({ icon, label, active, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`app-nav-btn ${active ? 'active' : ''}`}>
      {icon}
      <span className="nav-label">{label}</span>
    </button>
  );
}

export default function Header() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="app-header" style={{
      position: 'sticky', top: 0, left: 0, right: 0, zIndex: 50,
      background: 'rgba(11, 15, 25, 0.65)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
      padding: '18px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <div
        className="brand-text-container"
        onClick={() => navigate('/')}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
      >
        <img
          src="/favicon.svg"
          alt="ShadowCoach Logo"
          style={{
            width: '40px', height: '40px', borderRadius: '10px',
            border: '1px solid rgba(0, 245, 160, 0.35)',
            boxShadow: '0 0 12px rgba(0, 245, 160, 0.25)',
            objectFit: 'contain', background: 'rgba(255, 255, 255, 0.05)', padding: '4px',
          }}
        />
        <span style={{
          fontWeight: 900, fontSize: 'clamp(1.1rem, 3.5vw, 1.3rem)', letterSpacing: '1px',
          background: 'linear-gradient(135deg, #ffffff 40%, #94a3b8 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px',
        }}>
          SHADOWCOACH <span style={{ color: '#00f5a0', WebkitTextFillColor: 'initial', fontWeight: 900 }}>// BIOMECHANICS</span>
        </span>
      </div>

      <div className="top-nav-wrapper">
        <div className="top-nav-buttons">
          <NavButton
            active={pathname === '/'}
            onClick={() => navigate('/')}
            label="HOME"
            icon={<svg className="nav-icon" width="18" height="18" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>}
          />
          <NavButton
            active={pathname === '/live'}
            onClick={() => navigate('/live')}
            label="LIVE TELEMETRY"
            icon={<svg className="nav-icon" width="18" height="18" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" /></svg>}
          />
          <NavButton
            active={pathname === '/dashboard'}
            onClick={() => navigate('/dashboard')}
            label="VIDEO DASHBOARD"
            icon={<svg className="nav-icon" width="18" height="18" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>}
          />
        </div>
      </div>
    </nav>
  );
}
