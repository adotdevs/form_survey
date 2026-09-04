'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, ArrowRight } from 'lucide-react';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        router.push('/admin');
      } else {
        setError(data.error || 'Invalid password');
      }
    } catch (err) {
      setError('Network connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0b1d3a 0%, #112e51 50%, #1b3d6d 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#ffffff',
    }}>
      <div style={{
        maxWidth: '440px',
        width: '100%',
        background: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
        overflow: 'hidden',
        color: '#212121',
      }}>
        {/* Header */}
        <div style={{
          background: '#112e51',
          padding: '32px 28px',
          textAlign: 'center',
          borderBottom: '4px solid #005ea2',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            color: '#45c8f1',
          }}>
            <Shield size={32} />
          </div>
          <h1 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0', letterSpacing: '0.5px' }}>
            IRS Admin Portal
          </h1>
          <p style={{ color: '#aeb0b5', fontSize: '13px', margin: 0 }}>
            Digital Asset Verification &amp; Dossier Management
          </p>
        </div>

        {/* Body Form */}
        <form onSubmit={handleLogin} style={{ padding: '32px 28px' }}>
          {error && (
            <div style={{
              background: '#fdf2f2',
              border: '1px solid #f8b4b4',
              color: '#d9381e',
              padding: '12px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              marginBottom: '20px',
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#112e51', marginBottom: '8px' }}>
              Admin Security Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                required
                style={{
                  width: '100%',
                  height: '46px',
                  padding: '10px 14px 10px 40px',
                  fontSize: '15px',
                  color: '#112e51',
                  border: '1.5px solid #dfe1e2',
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
              <span style={{ position: 'absolute', left: '12px', top: '13px', color: '#71767a' }}>
                <Lock size={18} />
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              height: '46px',
              background: '#005ea2',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '15px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'background 0.2s',
            }}
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
