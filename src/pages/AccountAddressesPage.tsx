import React, { useEffect, useState } from 'react';
import { MapPin, Plus, Pencil, Trash2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { PageSeo } from '@/components/shared/PageSeo';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import type { Address } from '@/types';

const BLANK: Partial<Address> = {
  label: '', first_name: '', last_name: '', phone: '',
  address_line1: '', address_line2: '', city: '', state: '', postal_code: '', country: '', is_default: false,
};

export default function AccountAddressesPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState<Address | null>(null);
  const [form, setForm]           = useState<Partial<Address>>(BLANK);
  const [deleting, setDeleting]   = useState<Address | null>(null);
  const [saving, setSaving]       = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('addresses').select('*').eq('user_id', user.id).order('is_default', { ascending: false });
    setAddresses((data as Address[]) ?? []);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const set = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const openNew  = () => { setEditing(null); setForm(BLANK); setShowForm(true); };
  const openEdit = (a: Address) => { setEditing(a); setForm(a); setShowForm(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('addresses').update(form).eq('id', editing.id);
      if (error) { toastError('Could not save', error.message); setSaving(false); return; }
      success('Address updated');
    } else {
      const { error } = await supabase.from('addresses').insert({ ...form, user_id: user.id });
      if (error) { toastError('Could not save', error.message); setSaving(false); return; }
      success('Address added');
    }
    setSaving(false);
    setShowForm(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await supabase.from('addresses').delete().eq('id', deleting.id);
    setDeleting(null);
    success('Address deleted');
    load();
  };

  const setDefault = async (a: Address) => {
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', user!.id);
    await supabase.from('addresses').update({ is_default: true }).eq('id', a.id);
    success('Default address updated');
    load();
  };

  return (
    <>
      <PageSeo title="My Addresses" />
      <div className="account-card">
        <div className="account-card-header">
          <h1 className="account-card-title">Saved Addresses</h1>
          <button className="btn btn-primary btn-sm" onClick={openNew}>
            <Plus size={14} /> Add Address
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div style={{ borderBottom: '1px solid var(--color-border)', padding: 'var(--space-6)', background: 'var(--slate-50)' }}>
            <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-5)' }}>
              {editing ? 'Edit Address' : 'New Address'}
            </h2>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="auth-row">
                <div className="form-group">
                  <label className="form-label">Label <span className="form-label-optional">(optional)</span></label>
                  <input type="text" className="input" value={form.label ?? ''} onChange={set('label')} placeholder="Home, Work…" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input type="tel" className="input" value={form.phone ?? ''} onChange={set('phone')} />
                </div>
              </div>
              <div className="auth-row">
                <div className="form-group">
                  <label className="form-label">First Name *</label>
                  <input type="text" className="input" value={form.first_name ?? ''} onChange={set('first_name')} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name *</label>
                  <input type="text" className="input" value={form.last_name ?? ''} onChange={set('last_name')} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address Line 1 *</label>
                <input type="text" className="input" value={form.address_line1 ?? ''} onChange={set('address_line1')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Address Line 2 <span className="form-label-optional">(optional)</span></label>
                <input type="text" className="input" value={form.address_line2 ?? ''} onChange={set('address_line2')} />
              </div>
              <div className="auth-row">
                <div className="form-group">
                  <label className="form-label">City *</label>
                  <input type="text" className="input" value={form.city ?? ''} onChange={set('city')} required />
                </div>
                <div className="form-group">
                  <label className="form-label">State / Province</label>
                  <input type="text" className="input" value={form.state ?? ''} onChange={set('state')} />
                </div>
              </div>
              <div className="auth-row">
                <div className="form-group">
                  <label className="form-label">Postal Code</label>
                  <input type="text" className="input" value={form.postal_code ?? ''} onChange={set('postal_code')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Country *</label>
                  <input type="text" className="input" value={form.country ?? ''} onChange={set('country')} required />
                </div>
              </div>
              <label className="checkbox-group">
                <input type="checkbox" checked={!!form.is_default} onChange={e => setForm(p => ({ ...p, is_default: e.target.checked }))} />
                <span>Set as default address</span>
              </label>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Address'}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="account-card-body">
          {isLoading ? (
            <p style={{ color: 'var(--color-text-tertiary)', textAlign: 'center' }}>Loading…</p>
          ) : addresses.length === 0 && !showForm ? (
            <EmptyState icon={MapPin} title="No saved addresses" description="Add an address to speed up checkout." action={<button className="btn btn-primary" onClick={openNew}><Plus size={14} /> Add Address</button>} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-4)' }}>
              {addresses.map(addr => (
                <div key={addr.id} className="address-card" style={{ cursor: 'default', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
                    <div>
                      {addr.label && <p className="address-card-label">{addr.label}</p>}
                      {addr.is_default && <span className="badge badge-primary badge-sm">Default</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(addr)} aria-label="Edit"><Pencil size={13} /></button>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setDeleting(addr)} aria-label="Delete" style={{ color: 'var(--red-500)' }}><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <p className="address-card-name">{addr.first_name} {addr.last_name}</p>
                  <p className="address-card-text">
                    {addr.address_line1}{addr.address_line2 && `, ${addr.address_line2}`}<br />
                    {addr.city}{addr.state && `, ${addr.state}`} {addr.postal_code}<br />
                    {addr.country}
                  </p>
                  {!addr.is_default && (
                    <button className="btn btn-ghost btn-sm" onClick={() => setDefault(addr)}>
                      <Check size={13} /> Set as Default
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete Address"
        message="Are you sure you want to delete this address? This cannot be undone."
        confirmLabel="Delete"
      />
    </>
  );
}
