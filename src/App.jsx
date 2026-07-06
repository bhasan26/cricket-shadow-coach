import { Suspense, lazy } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import LandingPage from './LandingPage';
import Header from './components/Header';
import Hero from './components/Hero';
import AppFooter from './components/AppFooter';
import './App.css';

// Lazy load the heavy canvas/AI modules so they don't bloat the initial landing bundle
const CameraFeed = lazy(() => import('./CameraFeed'));
const VideoDashboard = lazy(() => import('./VideoDashboard'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const ContactUs = lazy(() => import('./pages/ContactUs'));

// Child components still navigate via legacy tab keys; map them to routes.
const TAB_TO_PATH = {
  home: '/', live: '/live', dashboard: '/dashboard',
  privacy: '/privacy', terms: '/terms', contact: '/contact',
};

const LoadingFallback = () => (
  <div style={{
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#050505', color: '#00f5a0', fontWeight: 800, letterSpacing: '1px',
    textTransform: 'uppercase',
  }}>
    Loading AI Modules...
  </div>
);

function AnalysisLayout({ children }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#050505',
      fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", color: '#f8fafc',
    }}>
      <Header />
      <Hero />
      <main className="main-content" style={{ maxWidth: '1440px', margin: '0 auto', padding: '20px' }}>
        <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
      </main>
      <AppFooter />
    </div>
  );
}

function LandingRoute() {
  const navigate = useNavigate();
  return (
    <LandingPage
      onStartAnalysis={() => navigate('/live')}
      onNavigate={(tab) => navigate(TAB_TO_PATH[tab] || '/')}
    />
  );
}

function LegalRoute({ Component }) {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Component onNavigate={(tab) => navigate(TAB_TO_PATH[tab] || '/')} />
    </Suspense>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingRoute />} />
      <Route path="/live" element={<AnalysisLayout><CameraFeed /></AnalysisLayout>} />
      <Route path="/dashboard" element={<AnalysisLayout><VideoDashboard /></AnalysisLayout>} />
      <Route path="/privacy" element={<LegalRoute Component={PrivacyPolicy} />} />
      <Route path="/terms" element={<LegalRoute Component={TermsOfService} />} />
      <Route path="/contact" element={<LegalRoute Component={ContactUs} />} />
      <Route path="*" element={<LandingRoute />} />
    </Routes>
  );
}

export default App;
