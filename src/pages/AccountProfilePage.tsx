import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Camera } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { PageSeo } from '@/components/shared/PageSeo';

export default function AccountProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const { success, error: toastError } = useToast();

  const [form, setForm]     = useState({ first_name: '', last_name: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const [passForm, setPassForm] = useState({ current: '', next: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [passSaving, setPassSaving] = useState(false);

  useEffect(() => {
    if (profile) setForm({ first_name: profile.first_name ?? '', last_name: profile.last_name ?? '', phone: profile.phone ?? '' });
  }, [profile]);

  const setF = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));
  const setP = (k: keyof typeof passForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setPassForm(p => ({ ...p, [k]: e.target.value }));

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update(form).eq('id', profile.id);
    setSaving(false);
    if (error) { toastError('Could not save', error.message); return; }
    await refreshProfile();
    success('Profile updated');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passForm.next !== passForm.confirm) { toastError('Passwords do not match'); return; }
    if (passForm.next.length < 8) { toastError('Password too short', 'Must be at least 8 characters'); return; }
    setPassSaving(true);
    const { error } = await supabase.auth.updateUser({ password: passForm.next });
    setPassSaving(false);
    if (error) { toastError('Could not update password', error.message); return; }
    success('Password changed');
    setPassForm({ current: '', next: '', confirm: '' });
  };

  return (
    <>
      <PageSeo title="Profile & Settings" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

        {/* Profile Info */}
        <div className="account-card">
          <div className="account-card-header"><h1 className="account-card-title">Profile Information</h1></div>
          <div className="account-card-body">
            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, var(--indigo-600), var(--violet-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)' }}>
                  {(profile?.first_name?.[0] ?? 'U').toUpperCase()}
                </div>
                <button style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: '50%', background: 'var(--color-primary)', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }} aria-label="Change avatar">
                  <Camera size={12} />
                </button>
              </div>
              <div>
                <p style={{ fontWeight: 'var(--font-semibold)' }}>{profile?.first_name} {profile?.last_name}</p>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>{profile?.role}</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: 480 }}>
              <div className="auth-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="prof-first">First Name</label>
                  <input id="prof-first" type="text" className="input" value={form.first_name} onChange={setF('first_name')} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="prof-last">Last Name</label>
                  <input id="prof-last" type="text" className="input" value={form.last_name} onChange={setF('last_name')} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="prof-phone">Phone</label>
                <input id="prof-phone" type="tel" className="input" value={form.phone} onChange={setF('phone')} placeholder="+1 555 000 0000" />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ alignSelf: 'flex-start' }}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>

        {/* Change Password */}
        <div className="account-card">
          <div className="account-card-header"><h2 className="account-card-title">Change Password</h2></div>
          <div className="account-card-body">
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: 480 }}>
              {[
                { id: 'cp-new', label: 'New Password', key: 'next' as const, ph: 'Min. 8 characters' },
                { id: 'cp-confirm', label: 'Confirm Password', key: 'confirm' as const, ph: 'Repeat new password' },
              ].map(({ id, label, key, ph }) => (
                <div key={id} className="form-group">
                  <label className="form-label" htmlFor={id}>{label}</label>
                  <div className="input-group">
                    <input id={id} type={showPass ? 'text' : 'password'} className="input" value={passForm[key]} onChange={setP(key)} placeholder={ph} autoComplete="new-password" />
                    <button type="button" className="input-icon-right clickable" onClick={() => setShowPass(p => !p)} aria-label="Toggle password">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              ))}
              <button type="submit" className="btn btn-primary" disabled={passSaving} style={{ alignSelf: 'flex-start' }}>
                {passSaving ? 'Updating…' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
