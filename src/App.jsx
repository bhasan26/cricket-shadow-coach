import React, { useState } from 'react';
import CameraFeed from './CameraFeed';
import VideoDashboard from './VideoDashboard';
import LandingPage from './LandingPage';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('home');

  if (activeTab === 'home') {
    return <LandingPage onStartAnalysis={() => setActiveTab('live')} />;
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'transparent',
      fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
      color: '#f8fafc',
    }}>
      {/* Floating Glass Navigation Header */}
      <nav className="app-header" style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'rgba(11, 15, 25, 0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
        padding: '18px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div 
          onClick={() => setActiveTab('home')}
          style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}
        >
          <img 
            src="/logo.png" 
            alt="Biotech AI Logo" 
            style={{ 
              width: '44px', 
              height: '44px', 
              borderRadius: '10px', 
              border: '1px solid rgba(0, 245, 160, 0.35)', 
              boxShadow: '0 0 12px rgba(0, 245, 160, 0.25)' 
            }} 
          />
          <span style={{ 
            fontWeight: 900, 
            fontSize: '1.3rem', 
            letterSpacing: '2px', 
            background: 'linear-gradient(135deg, #ffffff 40%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            SHADOWCOACH <span style={{ color: '#00f5a0', WebkitTextFillColor: 'initial', fontWeight: 900 }}>// BIOTECH.AI</span>
          </span>
        </div>
        
        <div>
          <div style={{
            display: 'flex',
            gap: '10px',
            background: 'rgba(0, 0, 0, 0.4)',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <button 
              onClick={() => setActiveTab('home')}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: '#94a3b8',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.color = '#ffffff'}
              onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
            >
              🏠 HOME
            </button>
            <button 
              onClick={() => setActiveTab('live')}
              style={{
                padding: '10px 20px',
                background: activeTab === 'live' ? 'rgba(0, 245, 160, 0.15)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: activeTab === 'live' ? '#00f5a0' : '#94a3b8',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              🔴 LIVE TELEMETRY
            </button>
            <button 
              onClick={() => setActiveTab('dashboard')}
              style={{
                padding: '10px 20px',
                background: activeTab === 'dashboard' ? 'rgba(0, 245, 160, 0.15)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: activeTab === 'dashboard' ? '#00f5a0' : '#94a3b8',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              📊 VIDEO DASHBOARD
            </button>
          </div>
        </div>
      </nav>

      {/* Cyberpunk Sports Telemetry Hero Banner */}
      <header style={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: '144px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px 20px',
        borderBottom: '1px solid rgba(0, 245, 160, 0.06)'
      }}>
        {/* Stadium backdrop */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/stadium-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 43%',
          backgroundRepeat: 'no-repeat',
          opacity: 0.18,
          filter: 'blue-shift contrast(1.25) brightness(0.75)',
        }} />
        
        {/* Shading gradient */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, transparent 0%, rgba(11, 15, 25, 0.92) 80%, #0b0f19 100%)',
        }} />
        
        {/* Tactical Biotech Coordinator Badge */}
        <span style={{ 
          color: '#00f5a0', 
          fontSize: '0.68rem', 
          fontWeight: 900, 
          letterSpacing: '3.5px', 
          textTransform: 'uppercase', 
          marginBottom: '8px', 
          zIndex: 2, 
          opacity: 0.85,
          fontFamily: "'Chakra Petch', 'JetBrains Mono', monospace",
          textShadow: '0 0 10px rgba(0, 245, 160, 0.3)'
        }}>
          [ BIOMETRIC SYSTEM CALIBRATION // APEX LIVE CORE v1.1 ]
        </span>
        
        <h1 style={{
          fontFamily: "'Chakra Petch', 'Plus Jakarta Sans', system-ui, sans-serif",
          fontSize: 'clamp(2rem, 5vw, 3.2rem)',
          fontWeight: 900,
          textTransform: 'uppercase',
          margin: 0,
          position: 'relative',
          zIndex: 2,
          letterSpacing: '4px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #ffffff 40%, #94a3b8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 4px 20px rgba(0,0,0,0.6)',
        }}>
          Cricket Shadow Coach
        </h1>
        <p style={{
          color: '#cbd5e1',
          fontSize: '1rem',
          marginTop: '6px',
          fontWeight: 600,
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
          maxWidth: '680px',
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}>
          Biomechanical AI Motion Capture & Sequence diagnostics
        </p>
        
        <div style={{
          width: '60px',
          height: '2px',
          background: 'linear-gradient(90deg, #00f5a0, #00e5ff)',
          marginTop: '12px',
          borderRadius: '10px',
          position: 'relative',
          zIndex: 2,
          boxShadow: '0 0 10px rgba(0, 245, 160, 0.4)',
        }} />
      </header>

      {/* Main Grid Dashboard */}
      <main className="main-content" style={{ maxWidth: '1440px', margin: '0 auto', padding: '20px' }}>
        {activeTab === 'live' ? <CameraFeed /> : <VideoDashboard />}
      </main>

      {/* Symmetrical Lab Branding Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '40px 20px',
        background: 'rgba(11, 15, 25, 0.85)',
        color: '#475569',
        fontSize: '0.8rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.03)',
        letterSpacing: '0.5px'
      }}>
        <span>Engineered by </span>
        <span style={{
          color: '#f8fafc',
          fontWeight: 800,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: '0.88rem',
          letterSpacing: '1px'
        }}>BILAL HASAN</span>
        <span style={{ margin: '0 14px', opacity: 0.15 }}>|</span>
        <span>© 2026 Sports Biomechanics Laboratory // SHADOWCOACH</span>
      </footer>
    </div>
  );
}

export default App;
