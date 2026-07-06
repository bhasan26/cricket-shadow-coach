import { useTheme } from '../useTheme';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      style={{
        padding: '8px 12px',
        fontSize: '18px',
        backgroundColor: 'transparent',
        border: '1px solid var(--border-glass)',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
        e.currentTarget.style.borderColor = 'var(--accent-mint)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.borderColor = 'var(--border-glass)';
      }}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
