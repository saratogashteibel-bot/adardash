'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase, type Entity, type Note } from '../lib/supabase';

const COLORS = ['--c0','--c1','--c2','--c3','--c4','--c5'];

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function timeAgo(ts: string) {
  const d = Date.now() - new Date(ts).getTime();
  if (d < 60000) return 'just now';
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

function getColor(idx: number) {
  const vars = [
    { bg: '#e8c547', text: '#0f0d00' },
    { bg: '#5ee8a0', text: '#001f0d' },
    { bg: '#e87a5e', text: '#1f0600' },
    { bg: '#7ab4e8', text: '#00101f' },
    { bg: '#c47ae8', text: '#150020' },
    { bg: '#e8a07a', text: '#1f0a00' },
  ];
  return vars[idx % vars.length];
}

export default function Home() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [who, setWho] = useState('');
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [addingEntity, setAddingEntity] = useState(false);
  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityType, setNewEntityType] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const notesEndRef = useRef<HTMLDivElement>(null);

  // Load name from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('adar-who');
    if (saved) setWho(saved);
  }, []);

  // Register SW
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
  }, []);

  // Load entities
  const loadEntities = useCallback(async () => {
    const { data } = await supabase
      .from('entities')
      .select('*')
      .order('created_at', { ascending: true });
    if (data) setEntities(data);
  }, []);

  // Load notes for active entity
  const loadNotes = useCallback(async (entityId: string) => {
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });
    if (data) setNotes(data);
  }, []);

  useEffect(() => { loadEntities(); }, [loadEntities]);

  useEffect(() => {
    if (!activeId) return;
    loadNotes(activeId);

    // Realtime subscription
    const channel = supabase
      .channel(`notes-${activeId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notes',
        filter: `entity_id=eq.${activeId}`,
      }, payload => {
        setNotes(prev => [payload.new as Note, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeId, loadNotes]);

  const selectEntity = (id: string) => {
    setActiveId(id);
    setNotes([]);
  };

  const postNote = async () => {
    if (!who.trim() || !body.trim() || !activeId) return;
    setPosting(true);
    localStorage.setItem('adar-who', who.trim());

    let attachment_url = null;
    let attachment_name = null;

    if (file) {
      const ext = file.name.split('.').pop();
      const path = `${activeId}/${Date.now()}.${ext}`;
      const { data: upload } = await supabase.storage
        .from('attachments')
        .upload(path, file, { upsert: true });
      if (upload) {
        const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
        attachment_url = urlData.publicUrl;
        attachment_name = file.name;
      }
    }

    await supabase.from('notes').insert({
      entity_id: activeId,
      who: who.trim(),
      body: body.trim(),
      attachment_url,
      attachment_name,
    });

    setBody('');
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
    setPosting(false);
  };

  const addEntity = async () => {
    if (!newEntityName.trim()) return;
    const { data } = await supabase.from('entities').insert({
      name: newEntityName.trim(),
      type: newEntityType.trim() || 'Entity',
      color: entities.length,
    }).select().single();
    if (data) {
      setEntities(prev => [...prev, data]);
      setNewEntityName('');
      setNewEntityType('');
      setAddingEntity(false);
    }
  };

  const active = entities.find(e => e.id === activeId);

  return (
    <main style={{ minHeight: '100vh', background: '#0f0f0f', padding: '0 0 80px 0' }}>
      {/* Header */}
      <header style={{
        padding: '20px 20px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
      }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Adar Global</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: '#f0f0f0' }}>Team Board</div>
        </div>
        <button
          onClick={() => setAddingEntity(true)}
          style={{
            fontSize: 13, padding: '8px 14px', borderRadius: 10,
            border: '1px solid #2e2e2e', background: '#1a1a1a',
            color: '#f0f0f0', fontWeight: 500,
          }}
        >+ Add</button>
      </header>

      {/* Add entity form */}
      {addingEntity && (
        <div style={{ margin: '0 20px 16px', background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#f0f0f0', marginBottom: 10 }}>New entity</div>
          <input
            value={newEntityName}
            onChange={e => setNewEntityName(e.target.value)}
            placeholder="Name (e.g. Sales, Reydel Tire)"
            style={inputStyle}
          />
          <input
            value={newEntityType}
            onChange={e => setNewEntityType(e.target.value)}
            placeholder="Type (e.g. Department, Client)"
            style={{ ...inputStyle, marginTop: 8 }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={addEntity} style={btnPrimary}>Add</button>
            <button onClick={() => setAddingEntity(false)} style={btnGhost}>Cancel</button>
          </div>
        </div>
      )}

      {/* Entity grid */}
      <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
        {entities.map((e, i) => {
          const c = getColor(e.color);
          const isActive = e.id === activeId;
          return (
            <button
              key={e.id}
              onClick={() => selectEntity(e.id)}
              style={{
                background: isActive ? c.bg : '#1a1a1a',
                border: isActive ? `2px solid ${c.bg}` : '1px solid #2e2e2e',
                borderRadius: 14,
                padding: '14px 14px',
                textAlign: 'left',
                transition: 'all 0.15s',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: isActive ? 'rgba(0,0,0,0.15)' : c.bg,
                color: isActive ? c.text : c.text,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 600, marginBottom: 10,
              }}>{initials(e.name)}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: isActive ? c.text : '#f0f0f0', marginBottom: 2 }}>{e.name}</div>
              <div style={{ fontSize: 11, color: isActive ? c.text : '#888', opacity: isActive ? 0.7 : 1 }}>{e.type}</div>
            </button>
          );
        })}
      </div>

      {/* Feed */}
      {!activeId ? (
        <div style={{ margin: '0 20px', padding: '40px 20px', background: '#1a1a1a', borderRadius: 14, textAlign: 'center', color: '#888', fontSize: 14 }}>
          Tap an entity to view updates
        </div>
      ) : (
        <div style={{ margin: '0 20px' }}>
          {/* Feed header */}
          {active && (() => {
            const c = getColor(active.color);
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: c.bg, color: c.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>{initials(active.name)}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#f0f0f0' }}>{active.name}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{active.type}</div>
                </div>
              </div>
            );
          })()}

          {/* Compose */}
          <div style={{ background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: 14, padding: 14, marginBottom: 14 }}>
            <input
              value={who}
              onChange={e => setWho(e.target.value)}
              placeholder="Your name"
              style={{ ...inputStyle, marginBottom: 8 }}
            />
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="What's the update?"
              rows={3}
              style={{ ...inputStyle, display: 'block' }}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postNote(); }}
            />

            {/* Attachment */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <button
                onClick={() => fileRef.current?.click()}
                style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '1px solid #2e2e2e', background: '#242424', color: '#888' }}
              >📎 {file ? file.name.slice(0, 20) + '…' : 'Attach'}</button>
              <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
              {file && <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }} style={{ fontSize: 12, color: '#888', background: 'none', border: 'none' }}>✕</button>}
              <button
                onClick={postNote}
                disabled={posting || !who.trim() || !body.trim()}
                style={{ ...btnPrimary, marginLeft: 'auto', opacity: (posting || !who.trim() || !body.trim()) ? 0.4 : 1 }}
              >{posting ? 'Posting…' : 'Post'}</button>
            </div>
          </div>

          {/* Notes list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notes.length === 0 ? (
              <div style={{ padding: '30px 20px', background: '#1a1a1a', borderRadius: 14, textAlign: 'center', color: '#888', fontSize: 13 }}>
                No updates yet — post the first one
              </div>
            ) : notes.map(n => (
              <div key={n.id} style={{ background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: 14, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#242424', color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>{initials(n.who)}</div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f0' }}>{n.who}</span>
                  <span style={{ fontSize: 11, color: '#888', marginLeft: 'auto' }}>{timeAgo(n.created_at)}</span>
                </div>
                <div style={{ fontSize: 14, color: '#ccc', lineHeight: 1.6 }}>{n.body}</div>
                {n.attachment_url && (
                  <a
                    href={n.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 12, color: '#e8c547', textDecoration: 'none', background: '#242424', padding: '6px 10px', borderRadius: 8 }}
                  >
                    📎 {n.attachment_name || 'View attachment'}
                  </a>
                )}
              </div>
            ))}
          </div>
          <div ref={notesEndRef} />
        </div>
      )}
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  fontSize: 14,
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #2e2e2e',
  background: '#242424',
  color: '#f0f0f0',
  outline: 'none',
};

const btnPrimary: React.CSSProperties = {
  fontSize: 13,
  padding: '8px 18px',
  borderRadius: 10,
  border: 'none',
  background: '#e8c547',
  color: '#0f0d00',
  fontWeight: 600,
  cursor: 'pointer',
};

const btnGhost: React.CSSProperties = {
  fontSize: 13,
  padding: '8px 14px',
  borderRadius: 10,
  border: '1px solid #2e2e2e',
  background: 'none',
  color: '#888',
  cursor: 'pointer',
};
