import { useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { io } from 'socket.io-client';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Messages.css';

const QUICK_EMOJIS = ['OK', 'Thanks', 'Done', 'Pinned'];

function initials(name = '') {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function formatTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Messages() {
  const { user } = useAuth();
  const outlet = useOutletContext() || {};
  const setLayoutMessageUnread = outlet.setMessageUnreadCount;
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const threadRef = useRef(null);
  const fileInputRef = useRef(null);
  const recorderRef = useRef(null);
  const sendingRef = useRef(false);
  const chunksRef = useRef([]);

  useEffect(() => { loadContacts(); }, []);

  useEffect(() => {
    const socket = io('/', { transports: ['websocket', 'polling'] });
    socket.on('message:new', (message) => {
      const open = selected && (
        (message.sender_id === selected.id && message.recipient_id === user.id) ||
        (message.sender_id === user.id && message.recipient_id === selected.id)
      );
      if (open) {
        appendMessage(message);
        if (message.sender_id === selected.id) api.markConversationRead(selected.id).catch(() => {});
      }
      loadContacts();
    });
    return () => socket.disconnect();
  }, [selected?.id, user?.id]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (selected) loadConversation(selected.id);
  }, [selected?.id]);

  async function loadContacts() {
    try {
      const data = await api.listMessageContacts();
      setContacts(data);
      publishUnreadTotal(data);
      if (!selected && data.length) setSelected(data[0]);
    } finally {
      setLoading(false);
    }
  }

  async function loadConversation(id) {
    const data = await api.getConversation(id);
    setMessages(data);
    setContacts((prev) => {
      const next = prev.map((contact) => contact.id === id ? { ...contact, unread_count: 0 } : contact);
      publishUnreadTotal(next);
      return next;
    });
  }

  function appendMessage(message) {
    setMessages((prev) => {
      if (prev.some((item) => item.id === message.id)) return prev;
      return [...prev, message];
    });
  }

  function publishUnreadTotal(list) {
    const total = list.reduce((sum, contact) => sum + Number(contact.unread_count || 0), 0);
    setLayoutMessageUnread?.(total);
    window.dispatchEvent(new CustomEvent('kis:messages-unread', { detail: { count: total } }));
  }

  async function send(e) {
    e?.preventDefault();
    const body = text.trim();
    if ((!body && !attachment) || !selected || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    try {
      const message = await api.sendMessage(selected.id, body, attachment);
      appendMessage(message);
      setText('');
      setAttachment(null);
      await loadContacts();
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      setRecording(false);
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
      if (!selected) return;
      if (sendingRef.current) return;
      sendingRef.current = true;
      setSending(true);
      try {
        const message = await api.sendMessage(selected.id, '', file, true);
        appendMessage(message);
        await loadContacts();
      } finally {
        sendingRef.current = false;
        setSending(false);
      }
    };
    recorder.start();
    setRecording(true);
  }

  function renderAttachment(message) {
    if (!message.attachment_url) return null;
    const isImage = message.attachment_mime?.startsWith('image/');
    const isAudio = message.attachment_mime?.startsWith('audio/') || message.is_voice_note;
    if (isImage) {
      return <img className="message-image" src={message.attachment_url} alt={message.attachment_name || 'Attachment'} />;
    }
    if (isAudio) {
      return (
        <div className="message-audio">
          <span>{message.is_voice_note ? 'Voice note' : message.attachment_name || 'Audio'}</span>
          <audio controls src={message.attachment_url} />
        </div>
      );
    }
    return (
      <a className="message-file" href={message.attachment_url} target="_blank" rel="noreferrer">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
        <span><strong>{message.attachment_name || 'Document'}</strong><small>{formatSize(message.attachment_size)}</small></span>
      </a>
    );
  }

  const filteredContacts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return contacts;
    return contacts.filter((contact) =>
      contact.full_name?.toLowerCase().includes(term) ||
      contact.username?.toLowerCase().includes(term) ||
      contact.role?.toLowerCase().includes(term)
    );
  }, [contacts, query]);

  const totalUnread = contacts.reduce((sum, contact) => sum + Number(contact.unread_count || 0), 0);

  return (
    <div className="messages-page">
      <div className="messages-shell">
        <aside className="messages-sidebar">
          <div className="messages-sidebar-head">
            <div>
              <h1>Messages</h1>
              <span>{totalUnread} unread</span>
            </div>
            <div className="messages-me">{initials(user?.full_name)}</div>
          </div>

          <div className="messages-search">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search accounts" />
          </div>

          <div className="messages-contact-list">
            {loading ? (
              <p className="messages-empty">Loading contacts...</p>
            ) : filteredContacts.length === 0 ? (
              <p className="messages-empty">No accounts found.</p>
            ) : filteredContacts.map((contact) => (
              <button type="button" key={contact.id} className={`messages-contact ${selected?.id === contact.id ? 'active' : ''}`} onClick={() => setSelected(contact)}>
                <span className="messages-avatar">{initials(contact.full_name)}</span>
                <span className="messages-contact-main">
                  <strong>{contact.full_name}</strong>
                  <small>{contact.last_message || contact.role}</small>
                </span>
                <span className="messages-contact-meta">
                  <time>{formatTime(contact.last_message_at)}</time>
                  {Number(contact.unread_count) > 0 && <b>{contact.unread_count}</b>}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="messages-chat">
          {selected ? (
            <>
              <header className="messages-chat-head">
                <div className="messages-avatar large">{initials(selected.full_name)}</div>
                <div>
                  <h2>{selected.full_name}</h2>
                  <span>{selected.role} - @{selected.username}</span>
                </div>
                <button type="button" className="messages-head-btn" onClick={() => loadConversation(selected.id)} title="Refresh">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/><path d="M3 12A9 9 0 0 1 18.5 5.8L21 8"/><path d="M21 3v5h-5"/></svg>
                </button>
              </header>

              <div className="messages-thread" ref={threadRef}>
                {messages.length === 0 ? (
                  <div className="messages-start">
                    <div className="messages-avatar large">{initials(selected.full_name)}</div>
                    <h3>{selected.full_name}</h3>
                    <p>Start a secure internal conversation with this account.</p>
                  </div>
                ) : messages.map((message) => {
                  const mine = message.sender_id === user.id;
                  return (
                    <div key={message.id} className={`message-row ${mine ? 'mine' : 'theirs'}`}>
                      <div className="message-bubble">
                        {renderAttachment(message)}
                        {message.body && <p>{message.body}</p>}
                        <span>{formatTime(message.created_at)} {mine && <em>{message.is_read ? '✓✓' : '✓'}</em>}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form className="messages-composer" onSubmit={send}>
                <div className="messages-emoji-row">
                  {QUICK_EMOJIS.map((label) => (
                    <button key={label} type="button" onClick={() => setText((value) => `${value}${value ? ' ' : ''}${label}`)}>{label}</button>
                  ))}
                  {attachment && <button type="button" className="attachment-chip" onClick={() => setAttachment(null)}>{attachment.name} x</button>}
                </div>
                <div className="messages-compose-row">
                  <button type="button" className="composer-tool" onClick={() => fileInputRef.current?.click()} aria-label="Attach file">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21.4 11.6-8.5 8.5a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/></svg>
                  </button>
                  <input ref={fileInputRef} type="file" hidden accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,audio/*" onChange={(e) => setAttachment(e.target.files?.[0] || null)} />
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={recording ? 'Recording voice note...' : 'Type a message'}
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                  />
                  <button type="button" className={`composer-tool ${recording ? 'recording' : ''}`} onClick={toggleRecording} disabled={sending} aria-label={recording ? 'Stop recording' : 'Record voice note'}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/></svg>
                  </button>
                  <button type="submit" className="composer-send" disabled={sending || (!text.trim() && !attachment)} aria-label="Send message">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="messages-no-chat">
              <h2>Select an account</h2>
              <p>Choose someone from the list to start messaging.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
