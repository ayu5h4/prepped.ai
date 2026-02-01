import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider } from '../lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';

const THEMES = ['system', 'light', 'dark'] as const;

function applyTheme(t: string) {
  const root = document.documentElement;
  if (t === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', t);
  }
}

const ProfileMenu: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('click', onDocClick);
    return () => window.removeEventListener('click', onDocClick);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('prepped-theme') || 'dark';
    applyTheme(stored);
  }, []);

  const handleGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/app');
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setOpen(false);
    navigate('/');
  };

  const setTheme = (t: string) => {
    localStorage.setItem('prepped-theme', t);
    applyTheme(t);
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: t }));
    setOpen(false);
  };

  return (
    <div className="profile-menu" ref={ref}>
      {user ? (
        <div className="profile-button" onClick={() => setOpen(!open)} title="Profile">
          <img src={user.photoURL || ''} alt={user.displayName || 'User'} className="profile-avatar" />
        </div>
      ) : (
        <button className="glass-button primary" onClick={() => navigate('/login')}>Sign In</button>
      )}

      {open && (
        <div className="profile-dropdown">
          <div className="dropdown-section">
            <div style={{fontWeight:700}}>{user?.displayName || 'Account'}</div>
            <div style={{fontSize:12, color:'var(--text-secondary)'}}>{user?.email}</div>
          </div>

          <div className="dropdown-section">
            <div style={{fontWeight:700, marginBottom:6}}>Theme</div>
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              {THEMES.map(t => (
                <button key={t} className="glass-button secondary" style={{padding: '8px 16px', fontSize: '0.85rem'}} onClick={() => setTheme(t)}>{t}</button>
              ))}
            </div>
          </div>

          <div className="dropdown-section">
            <button className="glass-button secondary" style={{padding: '8px 16px', fontSize: '0.85rem'}} onClick={handleLogout}>Log out</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileMenu;
