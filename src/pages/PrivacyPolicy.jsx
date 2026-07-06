import { useEffect } from 'react';
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
        <meta name="description" content="Your video never leaves your device. Only anonymous joint coordinates are sent for scoring. Read exactly what Cricket Shadow Coach transmits." />
      </Helmet>
      <LegalNav onNavigate={onNavigate} />

      <main className="legal-page-main">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 5vw, 4.5rem)', fontStyle: 'italic', marginBottom: '24px', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
          Privacy <span className="text-neon" style={{ color: 'var(--accent-mint)' }}>Policy</span>
        </h1>
        <div style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.8', fontFamily: 'var(--font-body)' }}>
          <p style={{ marginBottom: '24px' }}>Last Updated: July 6, 2026</p>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontStyle: 'italic', color: 'var(--text-primary)', marginTop: '48px', marginBottom: '16px' }}>1. Your Video Never Leaves Your Device</h2>
          <p style={{ marginBottom: '24px' }}>
            All camera capture and computer-vision pose estimation runs entirely in your browser. <strong>We never upload, store, or transmit your camera stream, video frames, or any images.</strong> No picture of you ever reaches our servers.
          </p>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontStyle: 'italic', color: 'var(--text-primary)', marginTop: '48px', marginBottom: '16px' }}>2. What Is Transmitted for Scoring</h2>
          <p style={{ marginBottom: '24px' }}>
            To score a shot, the app sends the pose skeleton — up to <strong>33 anonymous joint coordinates per frame</strong> (x, y, z position and a tracking-confidence value), for the frames of a single recorded attempt — to our analysis API. These are abstract numeric coordinates, not images, and cannot reconstruct your appearance or identify you. They are processed in memory to compute your score and are <strong>not persisted</strong> or logged after the response is returned.
          </p>
          <p style={{ marginBottom: '24px' }}>
            Your session history (past scores) is stored only in your own browser's local storage and is never sent to us. Clearing your browser data removes it.
          </p>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontStyle: 'italic', color: 'var(--text-primary)', marginTop: '48px', marginBottom: '16px' }}>3. Analytics</h2>
          <p style={{ marginBottom: '24px' }}>
            This site loads <strong>Google Analytics</strong> (gtag.js) to measure aggregate, anonymous usage such as page views and browser type. Google may set cookies as part of this. This data is not linked to your cricket analysis sessions or joint coordinates. You can block it with your browser's privacy settings or an ad/tracker blocker.
          </p>
        </div>
      </main>

      <Footer onNavigate={onNavigate} />
    </div>
  );
}
