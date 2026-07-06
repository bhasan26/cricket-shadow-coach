import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from '../App';

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
});
