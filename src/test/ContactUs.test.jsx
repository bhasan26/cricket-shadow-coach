import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkContactAvailability, sendContactMessage } from '../api';
import ContactUs from '../pages/ContactUs';

vi.mock('../api', () => ({ checkContactAvailability: vi.fn(), sendContactMessage: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  checkContactAvailability.mockResolvedValue(true);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function openContact() {
  return render(<MemoryRouter><HelmetProvider><ContactUs /></HelmetProvider></MemoryRouter>);
}

async function fillMessage() {
  await waitFor(() => expect(screen.getByRole('button', { name: 'Send message' })).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test visitor' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'visitor@example.com' } });
  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'The camera feedback is useful.' } });
}

describe('contact form', () => {
  it('disables delivery when the server is unconfigured and lets visitors recheck', async () => {
    checkContactAvailability.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    openContact();
    fireEvent.submit(screen.getByRole('form', { name: 'Contact form' }));
    expect(sendContactMessage).not.toHaveBeenCalled();
    await screen.findByText('Contact messages are temporarily unavailable. Please try again later.');
    expect(screen.getByLabelText('Name')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry connection' }));
    await waitFor(() => expect(screen.getByLabelText('Name')).toBeEnabled());
  });

  it('clears a message only after delivery is acknowledged', async () => {
    sendContactMessage.mockResolvedValue({ message: 'Your message was accepted for delivery.' });
    openContact();
    await fillMessage();
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    await screen.findByText('Your message was accepted for delivery.');
    expect(sendContactMessage).toHaveBeenCalledWith({
      name: 'Test visitor', email: 'visitor@example.com', message: 'The camera feedback is useful.', website: '',
    }, expect.any(AbortSignal));
    expect(screen.getByLabelText('Message')).toHaveValue('');
    expect(screen.getByLabelText('Email')).toHaveValue('');
  });

  it('keeps the draft after failure so visitors can retry explicitly', async () => {
    sendContactMessage.mockRejectedValue(new Error('Message delivery is temporarily unavailable.'));
    openContact();
    await fillMessage();
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Message delivery is temporarily unavailable.');
    expect(screen.getByLabelText('Message')).toHaveValue('The camera feedback is useful.');
    expect(screen.getByLabelText('Email')).toHaveValue('visitor@example.com');
    expect(screen.getByRole('button', { name: 'Send message' })).toBeEnabled();
  });

  it('blocks duplicate submissions while sending and aborts the wait on navigation', async () => {
    let finish;
    sendContactMessage.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const page = openContact();
    await fillMessage();
    const form = screen.getByRole('form', { name: 'Contact form' });
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(sendContactMessage).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled();
    expect(screen.getByLabelText('Message')).toBeDisabled();
    const signal = sendContactMessage.mock.calls[0][1];
    page.unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => { finish({ message: 'Accepted' }); });
  });
});
