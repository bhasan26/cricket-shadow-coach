import React, { useEffect } from 'react';
import LegalNav from '../components/LegalNav';
import Footer from '../components/Footer';

export default function ContactUs({ onNavigate }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="courto-landing" style={{ background: 'var(--bg-base)' }}>
      <LegalNav onNavigate={onNavigate} />
      
      <main className="legal-page-main">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 5vw, 4.5rem)', fontStyle: 'italic', marginBottom: '24px', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
          Get In <span className="text-neon" style={{ color: 'var(--accent-mint)' }}>Touch</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.8', fontFamily: 'var(--font-body)', marginBottom: '48px' }}>
          Have questions about our biomechanical analysis platform? Interested in partnering with us for your academy? Send us a message and our team will get back to you shortly.
        </p>

        <form style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} onSubmit={(e) => e.preventDefault()}>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>NAME</label>
              <input type="text" placeholder="Enter your name" style={{ width: '100%', padding: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '1rem' }} />
            </div>
            <div style={{ flex: '1 1 300px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>EMAIL</label>
              <input type="email" placeholder="Enter your email address" style={{ width: '100%', padding: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '1rem' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>MESSAGE</label>
            <textarea placeholder="How can we help you?" rows="6" style={{ width: '100%', padding: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '1rem', resize: 'vertical' }}></textarea>
          </div>
          <button className="courto-btn courto-btn-primary" style={{ alignSelf: 'flex-start', marginTop: '16px' }}>
            SEND MESSAGE
          </button>
        </form>
      </main>

      <Footer onNavigate={onNavigate} />
    </div>
  );
}
