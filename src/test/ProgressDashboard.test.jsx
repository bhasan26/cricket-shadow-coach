import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProgressDashboard from '../pages/ProgressDashboard';
import { PRACTICE_ARCHIVE_KEY } from '../practiceArchive';
import { completedPractice } from './practiceFixtures';

beforeEach(() => {
  const values = new Map();
  vi.stubGlobal('localStorage', { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function openProgress() {
  render(<MemoryRouter><HelmetProvider><ProgressDashboard /></HelmetProvider></MemoryRouter>);
}

describe('practice progress dashboard', () => {
  it('provides a useful first-session path without requesting camera access', () => {
    openProgress();
    expect(screen.getByRole('heading', { name: 'No completed practices yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start or resume guided practice' })).toHaveAttribute('href', '/live');
    expect(document.querySelector('video')).toBeNull();
  });

  it('shows the chart, exact scores, and selected practice details', () => {
    localStorage.setItem(PRACTICE_ARCHIVE_KEY, JSON.stringify([
      completedPractice({ id: 'older', completedAt: 100, before: 60, after: 70 }),
      completedPractice({ id: 'newer', completedAt: 200, before: 75, after: 85 }),
    ]));
    openProgress();
    expect(screen.getByRole('img', { name: 'Average reference match by practice' })).toBeInTheDocument();
    const details = screen.getByRole('region', { name: 'Practice details' });
    expect(within(details).getByText('85.0')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'View session' })[1]);
    expect(within(details).getByText('70.0')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download this practice' })).toBeEnabled();
  });

  it('filters the chart and details together and handles an empty filter result', () => {
    localStorage.setItem(PRACTICE_ARCHIVE_KEY, JSON.stringify([
      completedPractice({ id: 'right', before: 60, after: 70 }),
      completedPractice({ id: 'left', isRightHanded: false, facingMode: 'user', before: 80, after: 90 }),
    ]));
    openProgress();
    fireEvent.change(screen.getByRole('combobox', { name: 'Batting hand' }), { target: { value: 'left' } });
    expect(screen.getByRole('status')).toHaveTextContent('1 matching practice');
    expect(within(screen.getByRole('region', { name: 'Practice details' })).getByText('90.0')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Camera selection' }), { target: { value: 'environment' } });
    expect(screen.getByRole('heading', { name: 'No practices match these filters' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Practice details' })).not.toBeInTheDocument();
  });

  it('separates trends when saved practices use different scoring methods', () => {
    const updated = completedPractice({ id: 'updated' });
    for (const rep of [...updated.baseline, ...updated.repeat]) rep.scoringVersion = '2';
    localStorage.setItem(PRACTICE_ARCHIVE_KEY, JSON.stringify([completedPractice(), updated]));
    openProgress();
    expect(screen.getByRole('heading', { name: 'Scoring changed between these practices' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Average reference match by practice' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Calculation method' }), { target: { value: '2' } });
    expect(screen.getByRole('img', { name: 'Average reference match by practice' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('1 matching practice');
  });
});
