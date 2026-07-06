import { useState, useEffect } from 'react';

export default function InstallButton() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS
    const iosDetected =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !window.MSStream;
    setIsIOS(iosDetected);

    // Listen for the beforeinstallprompt event (Android/Chrome/Edge)
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Also show button if app is not already installed
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    ) {
      setIsVisible(false); // Don't show install button if already installed
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setIsVisible(false);
    }
  };

  const handleIOSInstall = () => {
    alert(
      'To install ShadowCoach on your iPhone:\n\n' +
      '1. Tap the Share button\n' +
      '2. Scroll down and tap "Add to Home Screen"\n' +
      '3. Tap "Add"\n\n' +
      'Your app will be ready to use like a native app!'
    );
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={isIOS ? handleIOSInstall : handleInstall}
      className="install-button"
      title="Download ShadowCoach as an app"
      style={{
        padding: '8px 14px',
        fontSize: '14px',
        fontWeight: '500',
        backgroundColor: '#10b981',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#10b981')}
    >
      ⬇️ {isIOS ? 'Install App' : 'Get App'}
    </button>
  );
}
