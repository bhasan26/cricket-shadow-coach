import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { checkContactAvailability, sendContactMessage } from '../api';
import LegalNav from '../components/LegalNav';
import Footer from '../components/Footer';
import './ContactUs.css';

const EMPTY_FORM = { name: '', email: '', message: '' };

export default function ContactUs({ onNavigate }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [availability, setAvailability] = useState('checking');
  const [status, setStatus] = useState('idle');
  const [notice, setNotice] = useState('');
  const pending = useRef(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    window.scrollTo(0, 0);
    checkContactAvailability().then(available => {
      if (mounted.current) setAvailability(available ? 'ready' : 'unavailable');
    });
    return () => { mounted.current = false; pending.current?.abort(); };
  }, []);

  const retryAvailability = async () => {
    setAvailability('checking');
    const available = await checkContactAvailability();
    if (mounted.current) setAvailability(available ? 'ready' : 'unavailable');
  };

  const submit = async event => {
    event.preventDefault();
    if (pending.current || availability !== 'ready') return;
    const website = new FormData(event.currentTarget).get('website') || '';
    const controller = new AbortController();
    pending.current = controller;
    setStatus('sending');
    setNotice('');
    try {
      const result = await sendContactMessage({ ...form, website }, controller.signal);
      if (!mounted.current || controller.signal.aborted) return;
      setForm(EMPTY_FORM);
      setStatus('success');
      setNotice(result.message);
    } catch (error) {
      if (!mounted.current || controller.signal.aborted) return;
      setStatus('error');
      setNotice(error.message || 'We could not confirm delivery. Your message is still here; please try again later.');
    } finally {
      pending.current = null;
    }
  };

  const update = event => setForm(previous => ({ ...previous, [event.target.name]: event.target.value }));

  return (
    <div className="courto-landing" style={{ background: 'var(--bg-base)' }}>
      <Helmet>
        <title>Contact Us — Cricket Shadow Coach</title>
        <meta name="description" content="Send a private message with questions or feedback about Cricket Shadow Coach." />
      </Helmet>
      <LegalNav onNavigate={onNavigate} />
      <main className="legal-page-main contact-page">
        <h1>Get In <span>Touch</span></h1>
        <p>Have a question, found a problem, or tried a practice session? Send a message with your feedback.</p>
        {availability === 'checking' && <p role="status">Checking message delivery…</p>}
        {availability === 'unavailable' && (
          <div className="contact-notice" role="status">
            <p>Contact messages are temporarily unavailable. Please try again later.</p>
            <button type="button" className="courto-btn courto-btn-outline" onClick={retryAvailability}>Retry connection</button>
          </div>
        )}
        <form onSubmit={submit} aria-label="Contact form" aria-busy={status === 'sending'}>
          <fieldset disabled={availability !== 'ready' || status === 'sending'}>
            <legend className="contact-sr-only">Your contact details and message</legend>
            <div className="contact-fields-row">
              <div><label htmlFor="contact-name">Name</label><input id="contact-name" name="name" autoComplete="name" required maxLength={100} value={form.name} onChange={update} /></div>
              <div><label htmlFor="contact-email">Email</label><input id="contact-email" name="email" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={update} /></div>
            </div>
            <div><label htmlFor="contact-message">Message</label><textarea id="contact-message" name="message" required minLength={10} maxLength={4000} rows={6} value={form.message} onChange={update} /></div>
            <div hidden aria-hidden="true"><label htmlFor="contact-website">Website</label><input id="contact-website" name="website" autoComplete="off" tabIndex={-1} /></div>
            <p className="contact-privacy">Your name, email, and message are sent privately through our email provider so we can respond. <Link to="/privacy">Privacy policy</Link></p>
            <button type="submit" className="courto-btn courto-btn-primary">{status === 'sending' ? 'Sending…' : 'Send message'}</button>
          </fieldset>
        </form>
        {notice && <p className={`contact-notice ${status}`} role={status === 'error' ? 'alert' : 'status'}>{notice}</p>}
      </main>
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
