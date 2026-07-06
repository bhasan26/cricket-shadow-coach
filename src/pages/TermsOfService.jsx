import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import LegalNav from '../components/LegalNav';
import Footer from '../components/Footer';

export default function TermsOfService({ onNavigate }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="courto-landing" style={{ background: 'var(--bg-base)' }}>
      <Helmet>
        <title>Terms of Service — Cricket Shadow Coach</title>
        <meta name="description" content="Read the terms of service for Cricket Shadow Coach's free AI-powered cricket batting and bowling technique analysis tool." />
      </Helmet>
      <LegalNav onNavigate={onNavigate} />
      
      <main className="legal-page-main">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 5vw, 4.5rem)', fontStyle: 'italic', marginBottom: '24px', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
          Terms of <span className="text-neon" style={{ color: 'var(--accent-mint)' }}>Service</span>
        </h1>
        <div style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.8', fontFamily: 'var(--font-body)' }}>
          <p style={{ marginBottom: '24px' }}>Last Updated: June 23, 2026</p>
          
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontStyle: 'italic', color: 'var(--text-primary)', marginTop: '48px', marginBottom: '16px' }}>1. Acceptance of Terms</h2>
          <p style={{ marginBottom: '24px' }}>
            By accessing or using the Cricket Shadow Coach platform, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.
          </p>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontStyle: 'italic', color: 'var(--text-primary)', marginTop: '48px', marginBottom: '16px' }}>2. Use of Service</h2>
          <p style={{ marginBottom: '24px' }}>
            The AI-powered biomechanical analysis provided is intended for educational and training purposes only. While we strive for accuracy, our systems should not be used as the sole basis for diagnosing injuries or ensuring strict regulatory compliance in official matches.
          </p>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontStyle: 'italic', color: 'var(--text-primary)', marginTop: '48px', marginBottom: '16px' }}>3. Disclaimer of Warranties</h2>
          <p style={{ marginBottom: '24px' }}>
            The service is provided "as is" and "as available". We make no warranties, expressed or implied, regarding the accuracy, reliability, or availability of the computer vision analysis. You use the platform at your own risk.
          </p>
        </div>
      </main>

      <Footer onNavigate={onNavigate} />
    </div>
  );
}
