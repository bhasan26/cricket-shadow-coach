import React from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import CameraFeed from './CameraFeed';
import './App.css';

function App() {
  return (
    <div style={{ 
      minHeight: '100vh',
      background: '#f5f2ec',
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      color: '#2d3a2e',
    }}>
      {/* Hero Header with Stadium Image */}
      <header style={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: '220px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        {/* Stadium background in header only */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/stadium-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
          backgroundRepeat: 'no-repeat',
        }} />
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(20,35,20,0.55) 0%, rgba(30,50,25,0.7) 60%, rgba(45,58,46,0.95) 100%)',
        }} />
        {/* Top bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '10px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: 'rgba(255,255,255,0.6)',
          zIndex: 2,
        }}>
          <span>🏏 Cricket Shadow Coach</span>
          <span style={{
            background: 'rgba(255,180,0,0.25)',
            color: '#f5c842',
            padding: '2px 10px',
            borderRadius: '10px',
            fontSize: '0.7rem',
            fontWeight: 600,
          }}>⚠️ Beta</span>
        </div>
        {/* Title */}
        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '3rem',
          fontWeight: 700,
          color: '#fff',
          margin: 0,
          position: 'relative',
          zIndex: 2,
          textShadow: '0 3px 20px rgba(0,0,0,0.4)',
        }}>
          Cricket Shadow Coach
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.75)',
          fontSize: '1rem',
          marginTop: '10px',
          position: 'relative',
          zIndex: 2,
        }}>
          Professional Training Meets AI — Perfect Your Batting Technique
        </p>
        <div style={{
          width: '60px',
          height: '3px',
          background: 'linear-gradient(90deg, #c8a95e, #e8d48b)',
          margin: '14px auto 0',
          borderRadius: '2px',
          position: 'relative',
          zIndex: 2,
        }} />
      </header>

      <main style={{ maxWidth: '1240px', margin: '0 auto', padding: '32px 20px 40px' }}>
        <CameraFeed />
      </main>

      <footer style={{
        textAlign: 'center',
        padding: '28px 20px',
        background: '#2d3a2e',
        color: 'rgba(255,255,255,0.4)',
        fontSize: '0.85rem',
      }}>
        <span style={{
          color: '#c8a95e',
          fontWeight: 600,
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '0.95rem',
        }}>Built by Bilal</span>
        <span style={{ margin: '0 10px', opacity: 0.3 }}>|</span>
        <span>Still in Test</span>
      </footer>
      <SpeedInsights />
    </div>
  );
}

export default App;
