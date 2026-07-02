import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import LegalNav from '../components/LegalNav';
import Footer from '../components/Footer';

export default function PrivacyPolicy({ onNavigate }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="courto-landing" style={{ background: 'var(--bg-base)' }}>
      <Helmet>
        <title>Privacy Policy — Cricket Shadow Coach</title>
        <meta name="description" content="Cricket Shadow Coach processes all video and biomechanical data locally in your browser. Read our privacy policy on local-first data processing." />
      </Helmet>
      <LegalNav onNavigate={onNavigate} />
      
      <main className="legal-page-main">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 5vw, 4.5rem)', fontStyle: 'italic', marginBottom: '24px', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
          Privacy <span className="text-neon" style={{ color: 'var(--accent-mint)' }}>Policy</span>
        </h1>
        <div style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.8', fontFamily: 'var(--font-body)' }}>
          <p style={{ marginBottom: '24px' }}>Last Updated: June 23, 2026</p>
          
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontStyle: 'italic', color: 'var(--text-primary)', marginTop: '48px', marginBottom: '16px' }}>1. Local Data Processing Guarantee</h2>
          <p style={{ marginBottom: '24px' }}>
            Cricket Shadow Coach is engineered with a strict local-first architecture. <strong>We do not upload, store, or transmit your video feeds, camera streams, or biomechanical data to any cloud servers.</strong> All computer vision processing and machine learning inference occurs directly within your device's browser. Your technique data never leaves your computer or mobile device.
          </p>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontStyle: 'italic', color: 'var(--text-primary)', marginTop: '48px', marginBottom: '16px' }}>2. Information We Do Not Collect</h2>
          <p style={{ marginBottom: '24px' }}>
            Because our application runs locally, we do not collect:
          </p>
          <ul style={{ paddingLeft: '24px', marginBottom: '24px' }}>
            <li style={{ marginBottom: '8px' }}>Facial recognition data or biometric identifiers</li>
            <li style={{ marginBottom: '8px' }}>Video recordings or live camera streams</li>
            <li style={{ marginBottom: '8px' }}>Skeletal tracking coordinates (landmarks)</li>
            <li style={{ marginBottom: '8px' }}>Performance scores or analysis results</li>
          </ul>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontStyle: 'italic', color: 'var(--text-primary)', marginTop: '48px', marginBottom: '16px' }}>3. Analytics & Telemetry</h2>
          <p style={{ marginBottom: '24px' }}>
            We only collect standard anonymous web telemetry (such as page views and browser types) to ensure the platform functions correctly and to monitor overall site traffic. This data cannot be linked back to individual users or their specific cricket analysis sessions.
          </p>
        </div>
      </main>

      <Footer onNavigate={onNavigate} />
    </div>
  );
}
