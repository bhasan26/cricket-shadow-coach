import React from 'react';

export default function Footer({ onNavigate }) {
  return (
    <footer className="courto-footer">
      <div className="footer-top">
        <div className="footer-brand">
          <div className="footer-logo">CRICKET<span>COACH</span></div>
          <p className="footer-desc">AI-powered cricket coaching delivering laboratory-grade biomechanical analysis to every player.</p>
        </div>
        <div className="footer-links">
          <div className="footer-col">
            <h4>EXPLORE</h4>
            <a href="#how-it-works" onClick={(e) => { e.preventDefault(); onNavigate('home'); }}>How It Works</a>
            <a href="#features" onClick={(e) => { e.preventDefault(); onNavigate('home'); }}>Features</a>
            <a href="#pricing" onClick={(e) => { e.preventDefault(); onNavigate('home'); }}>Pricing</a>
          </div>
          <div className="footer-col">
            <h4>LEGAL</h4>
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('privacy'); }}>Privacy Policy</a>
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('terms'); }}>Terms of Service</a>
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('contact'); }}>Contact Us</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2026 CricketCoach.Online. All rights reserved.</p>
        <p>Engineered by Bilal Hasan</p>
      </div>
    </footer>
  );
}
