'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase, type Entity, type Note } from '../lib/supabase';

const PALETTES = [
  { bg: '#E6F1FB', border: '#378ADD', text: '#0C447C' },
  { bg: '#E1F5EE', border: '#1D9E75', text: '#085041' },
  { bg: '#EEEDFE', border: '#7F77DD', text: '#3C3489' },
  { bg: '#FAEEDA', border: '#BA7517', text: '#633806' },
  { bg: '#FAECE7', border: '#D85A30', text: '#712B13' },
  { bg: '#FBEAF0', border: '#D4537E', text: '#72243E' },
  { bg: '#EAF3DE', border: '#639922', text: '#27500A' },
];

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

  useEffect(() => {
    const saved = localStorage.getItem('adar-who');
    if (saved) setWho(saved);
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
  }, []);

  const loadEntities = useCallback(async () => {
    const { data } = await supabase
      .from('entities')
      .select('*')
      .order('created_at', { ascending: true });
    if (data) setEntities(data);
  }, []);

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
    const channel = supabase
      .channel(`notes-${activeId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notes',
        filter: `entity_id=eq.${activeId}`,
      }, payload => {
        setNotes(prev => [payload.new as Note, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeId, loadNotes]);

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
        .from('attachments').upload(path, file, { upsert: true });
      if (upload) {
        const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
        attachment_url = urlData.publicUrl;
        attachment_name = file.name;
      }
    }

    await supabase.from('notes').insert({
      entity_id: activeId, who: who.trim(), body: body.trim(),
      attachment_url, attachment_name,
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

  const s = {
    page: { minHeight: '100vh', background: '#fff', fontFamily: "'DM Sans', sans-serif" } as React.CSSProperties,
    header: { padding: '28px 20px 0', marginBottom: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' } as React.CSSProperties,
    eyebrow: { fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#888', marginBottom: 4, fontWeight: 500 },
    title: { fontSize: 26, fontWeight: 600, color: '#111' },
    addBtn: { fontSize: 12, padding: '7px 14px', borderRadius: 8, border: '0.5px solid #e0e0e0', background: '#fff', color: '#333', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 } as React.CSSProperties,
    grid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10, padding: '0 20px', marginBottom: 24 } as React.CSSProperties,
    inp: { width: '100%', fontSize: 14, padding: '10px 12px', borderRadius: 8, border: '0.5px solid #e0e0e0', background: '#f8f8f8', color: '#111', outline: 'none', display: 'block', fontFamily: "'DM Sans', sans-serif" } as React.CSSProperties,
    postBtn: (disabled: boolean) => ({ fontSize: 13, padding: '9px 20px', borderRadius: 8, border: 'none', background: disabled ? '#ccc' : '#378ADD', color: '#fff', fontWeight: 500, cursor: disabled ? 'default' : 'pointer', marginLeft: 'auto', fontFamily: "'DM Sans', sans-serif" } as React.CSSProperties),
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      <main style={s.page}>
        <header style={s.header}>
          <div>
            <div style={s.eyebrow}>Adar Global</div>
            <div style={s.title}>Team board</div>
          </div>
          <button onClick={() => setAddingEntity(true)} style={s.addBtn}>+ Add</button>
        </header>

        {addingEntity && (
          <div style={{ margin: '0 20px 20px', background: '#fff', border: '0.5px solid #e0e0e0', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10, color: '#111' }}>New entity</div>
            <input value={newEntityName} onChange={e => setNewEntityName(e.target.value)} placeholder="Name" style={s.inp} />
            <input value={newEntityType} onChange={e => setNewEntityType(e.target.value)} placeholder="Type (e.g. Department, Client)" style={{ ...s.inp, marginTop: 8 }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={addEntity} style={s.postBtn(false)}>Add</button>
              <button onClick={() => setAddingEntity(false)} style={{ fontSize: 13, padding: '9px 14px', borderRadius: 8, border: '0.5px solid #e0e0e0', background: 'none', color: '#888', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        <div style={s.grid}>
          {entities.map((e) => {
            const p = PALETTES[e.color % PALETTES.length];
            const isActive = e.id === activeId;
            return (
              <button key={e.id} onClick={() => { setActiveId(e.id); setNotes([]); }} style={{
                background: isActive ? p.bg : '#fff',
                border: isActive ? `1.5px solid ${p.border}` : '0.5px solid #e0e0e0',
                borderRadius: 12, padding: '14px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.12s',
              }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: isActive ? 'rgba(0,0,0,0.1)' : p.bg, color: p.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, marginBottom: 10 }}>
                  {initials(e.name)}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? p.text : '#111', lineHeight: 1.3, marginBottom: 3 }}>{e.name}</div>
                <div style={{ fontSize: 11, color: isActive ? p.text : '#888', opacity: isActive ? 0.75 : 1 }}>{e.type}</div>
                <span style={{ fontSize: 11, marginTop: 8, display: 'inline-block', padding: '2px 8px', borderRadius: 20, background: isActive ? 'rgba(0,0,0,0.1)' : '#f3f3f3', color: isActive ? p.text : '#888' }}>
                  {notes.length === 0 && e.id !== activeId ? '—' : e.id === activeId ? `${notes.length} notes` : '—'}
                </span>
              </button>
            );
          })}
        </div>

        {!activeId ? (
          <div style={{ margin: '0 20px', padding: '40px 20px', background: '#f8f8f8', borderRadius: 12, textAlign: 'center', color: '#888', fontSize: 13 }}>
            Tap an entity above to view and post updates
          </div>
        ) : (
          <div style={{ padding: '0 20px 60px' }}>
            {active && (() => {
              const p = PALETTES[active.color % PALETTES.length];
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: p.bg, color: p.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>{initials(active.name)}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{active.name}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{active.type}</div>
                  </div>
                </div>
              );
            })()}

            <div style={{ background: '#fff', border: '0.5px solid #e0e0e0', borderRadius: 12, padding: 14, marginBottom: 14 }}>
              <input value={who} onChange={e => setWho(e.target.value)} placeholder="Your name" style={s.inp} />
              <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="What's the update?" rows={3}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postNote(); }}
                style={{ ...s.inp, marginTop: 8, resize: 'none', minHeight: 80 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <button onClick={() => fileRef.current?.click()} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '0.5px solid #e0e0e0', background: '#f8f8f8', color: '#888', cursor: 'pointer' }}>
                  📎 {file ? file.name.slice(0, 18) + '…' : 'Attach'}
                </button>
                <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
                {file && <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }} style={{ fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>}
                <button onClick={postNote} disabled={posting || !who.trim() || !body.trim()} style={s.postBtn(posting || !who.trim() || !body.trim())}>
                  {posting ? 'Posting…' : 'Post'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notes.length === 0 ? (
                <div style={{ padding: '30px 16px', background: '#f8f8f8', borderRadius: 12, textAlign: 'center', color: '#888', fontSize: 13 }}>
                  No updates yet — post the first one
                </div>
              ) : notes.map(n => (
                <div key={n.id} style={{ background: '#fff', border: '0.5px solid #e0e0e0', borderRadius: 12, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f3f3f3', color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>{initials(n.who)}</div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{n.who}</span>
                    <span style={{ fontSize: 11, color: '#888', marginLeft: 'auto' }}>{timeAgo(n.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 14, color: '#333', lineHeight: 1.6 }}>{n.body}</div>
                  {n.attachment_url && (
                    <a href={n.attachment_url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 12, color: '#378ADD', textDecoration: 'none', background: '#f0f7ff', padding: '6px 10px', borderRadius: 8 }}>
                      📎 {n.attachment_name || 'View attachment'}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
