import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/app');
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate('/app');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    }
  };

  const handleGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/app');
    } catch (err) {
      setError('Google sign in failed');
    }
  };

  return (
    <div className="login-root">
      <div className="login-container">
        <div className="login-card">
          <h2>Sign in to Prepped.ai</h2>
          <form onSubmit={handleEmailSignIn} style={{display:'flex', flexDirection:'column', gap:16}}>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="glass-input" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" className="glass-input" />
            <div style={{display:'flex', gap:8}}>
              <button className="glass-button primary" type="submit">Sign In</button>
              <button className="glass-button secondary" onClick={handleRegister}>Register</button>
            </div>
          </form>

          <div style={{marginTop:20}}>
            <button className="glass-button primary" onClick={handleGoogle}>Sign in with Google</button>
          </div>

          {error && <div style={{color:'crimson', marginTop:16}}>{error}</div>}
        </div>
      </div>
    </div>
  );
}

export default Login;
