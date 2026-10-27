import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from '../App';
import { ThemeProvider } from '../contexts/ThemeProvider';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('App', () => {
  it('renders the landing page at /', () => {
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      </HelmetProvider>
    );
    // The landing hero headline is present.
    expect(screen.getAllByText(/cricket/i).length).toBeGreaterThan(0);
  });

  it('opens the progress route even when browser storage is blocked', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('Storage blocked'); },
      setItem: () => { throw new Error('Storage blocked'); },
    });
    render(
      <ThemeProvider><HelmetProvider><MemoryRouter initialEntries={['/progress']}><App /></MemoryRouter></HelmetProvider></ThemeProvider>
    );
    expect(await screen.findByRole('heading', { name: 'Your practice progress' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PROGRESS' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { name: 'No completed practices yet' })).toBeInTheDocument();
  });
});
