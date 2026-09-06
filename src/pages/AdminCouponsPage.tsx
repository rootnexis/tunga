import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Tag, Search, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { PageSeo } from '@/components/shared/PageSeo';
import { Spinner } from '@/components/shared/Spinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { formatCurrency, formatDateShort } from '@/utils/formatters';
import type { Coupon } from '@/types';

// ── Modal form state ───────────────────────────────────────────────────────
interface CouponForm {
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: string;
  min_order_amount: string;
  max_discount_amount: string;
  applicable_to: 'all' | 'category' | 'product';
  max_uses: string;
  max_uses_per_customer: string;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
}

const EMPTY_FORM: CouponForm = {
  code: '',
  type: 'percentage',
  value: '',
  min_order_amount: '',
  max_discount_amount: '',
  applicable_to: 'all',
  max_uses: '',
  max_uses_per_customer: '1',
  starts_at: '',
  expires_at: '',
  is_active: true,
};

function couponToForm(c: Coupon): CouponForm {
  return {
    code: c.code,
    type: c.type,
    value: c.value.toString(),
    min_order_amount: c.min_order_amount?.toString() ?? '',
    max_discount_amount: c.max_discount_amount?.toString() ?? '',
    applicable_to: c.applicable_to,
    max_uses: c.max_uses?.toString() ?? '',
    max_uses_per_customer: c.max_uses_per_customer.toString(),
    starts_at: c.starts_at ? c.starts_at.slice(0, 10) : '',
    expires_at: c.expires_at ? c.expires_at.slice(0, 10) : '',
    is_active: c.is_active,
  };
}

// ── CouponModal ────────────────────────────────────────────────────────────
interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editing: Coupon | null;
}

function CouponModal({ isOpen, onClose, onSave, editing }: CouponModalProps) {
  const { success, error: toastError } = useToast();
  const [form, setForm] = useState<CouponForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<CouponForm>>({});

  useEffect(() => {
    if (isOpen) {
      setForm(editing ? couponToForm(editing) : EMPTY_FORM);
      setErrors({});
    }
  }, [isOpen, editing]);

  const set = (k: keyof CouponForm, v: string | boolean) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const validate = (): boolean => {
    const e: Partial<CouponForm> = {};
    if (!form.code.trim()) e.code = 'Required';
    if (!form.value || isNaN(Number(form.value)) || Number(form.value) <= 0)
      e.value = 'Must be a positive number';
    if (form.type === 'percentage' && Number(form.value) > 100)
      e.value = 'Cannot exceed 100%';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);

    const payload = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value),
      min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : null,
      max_discount_amount: form.max_discount_amount ? Number(form.max_discount_amount) : null,
      applicable_to: form.applicable_to,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      max_uses_per_customer: Number(form.max_uses_per_customer) || 1,
      starts_at: form.starts_at || null,
      expires_at: form.expires_at || null,
      is_active: form.is_active,
    };

    const { error } = editing
      ? await supabase.from('coupons').update(payload).eq('id', editing.id)
      : await supabase.from('coupons').insert(payload);

    setSaving(false);
    if (error) { toastError('Save failed', error.message); return; }
    success(editing ? 'Coupon updated' : 'Coupon created');
    onSave();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 560, width: '100%' }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={editing ? 'Edit Coupon' : 'Create Coupon'}
      >
        <div className="modal-header">
          <h2 className="modal-title">{editing ? 'Edit Coupon' : 'Create Coupon'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Code */}
            <div className="form-group">
              <label className="form-label" htmlFor="coupon-code">Code <span className="form-required">*</span></label>
              <input
                id="coupon-code"
                type="text"
                className={`input${errors.code ? ' input-error' : ''}`}
                value={form.code}
                onChange={e => set('code', e.target.value.toUpperCase())}
                placeholder="SUMMER20"
                style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}
              />
              {errors.code && <p className="form-error">{errors.code}</p>}
            </div>

            {/* Type + Value */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="coupon-type">Type <span className="form-required">*</span></label>
                <select
                  id="coupon-type"
                  className="input"
                  value={form.type}
                  onChange={e => set('type', e.target.value)}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed amount</option>
                  <option value="free_shipping">Free shipping</option>
                </select>
              </div>
              {form.type !== 'free_shipping' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="coupon-value">
                    Value <span className="form-required">*</span>
                    <span className="form-label-optional">
                      {form.type === 'percentage' ? ' (%)' : ' ($)'}
                    </span>
                  </label>
                  <input
                    id="coupon-value"
                    type="number"
                    className={`input${errors.value ? ' input-error' : ''}`}
                    value={form.value}
                    onChange={e => set('value', e.target.value)}
                    min="0.01"
                    step="0.01"
                    placeholder={form.type === 'percentage' ? '20' : '10.00'}
                  />
                  {errors.value && <p className="form-error">{errors.value}</p>}
                </div>
              )}
            </div>

            {/* Min order / Max discount */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="coupon-min">
                  Min order <span className="form-label-optional">($)</span>
                </label>
                <input
                  id="coupon-min"
                  type="number"
                  className="input"
                  value={form.min_order_amount}
                  onChange={e => set('min_order_amount', e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              {form.type === 'percentage' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="coupon-max-discount">
                    Max discount <span className="form-label-optional">($)</span>
                  </label>
                  <input
                    id="coupon-max-discount"
                    type="number"
                    className="input"
                    value={form.max_discount_amount}
                    onChange={e => set('max_discount_amount', e.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="Unlimited"
                  />
                </div>
              )}
            </div>

            {/* Uses */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="coupon-max-uses">
                  Max uses <span className="form-label-optional">(total)</span>
                </label>
                <input
                  id="coupon-max-uses"
                  type="number"
                  className="input"
                  value={form.max_uses}
                  onChange={e => set('max_uses', e.target.value)}
                  min="1"
                  step="1"
                  placeholder="Unlimited"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="coupon-per-customer">Per customer</label>
                <input
                  id="coupon-per-customer"
                  type="number"
                  className="input"
                  value={form.max_uses_per_customer}
                  onChange={e => set('max_uses_per_customer', e.target.value)}
                  min="1"
                  step="1"
                />
              </div>
            </div>

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="coupon-starts">Starts at</label>
                <input
                  id="coupon-starts"
                  type="date"
                  className="input"
                  value={form.starts_at}
                  onChange={e => set('starts_at', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="coupon-expires">Expires at</label>
                <input
                  id="coupon-expires"
                  type="date"
                  className="input"
                  value={form.expires_at}
                  onChange={e => set('expires_at', e.target.value)}
                />
              </div>
            </div>

            {/* Active toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <button
                type="button"
                onClick={() => set('is_active', !form.is_active)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: form.is_active ? 'var(--emerald-500)' : 'var(--color-text-tertiary)' }}
                aria-label="Toggle active"
              >
                {form.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
              </button>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                {form.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Coupon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function AdminCouponsPage() {
  const { success, error: toastError } = useToast();
  const [coupons, setCoupons]   = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch]     = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState<Coupon | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    let q = supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (search) q = q.ilike('code', `%${search}%`);
    const { data } = await q;
    setCoupons((data as Coupon[]) ?? []);
    setIsLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const handleToggleActive = async (coupon: Coupon) => {
    const { error } = await supabase
      .from('coupons')
      .update({ is_active: !coupon.is_active })
      .eq('id', coupon.id);
    if (error) { toastError('Update failed', error.message); return; }
    success(coupon.is_active ? 'Coupon deactivated' : 'Coupon activated');
    load();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from('coupons').delete().eq('id', deleting.id);
    if (error) { toastError('Delete failed', error.message); setDeleting(null); return; }
    success('Coupon deleted');
    setDeleting(null);
    load();
  };

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit   = (c: Coupon) => { setEditing(c); setModalOpen(true); };

  const formatValue = (c: Coupon) => {
    if (c.type === 'percentage')    return `${c.value}%`;
    if (c.type === 'fixed')         return formatCurrency(c.value, 'USD');
    return 'Free shipping';
  };

  return (
    <>
      <PageSeo title="Coupons — Admin" />
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Coupons</h1>
          <p className="admin-page-desc">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''}</p>
        </div>
        <button id="create-coupon-btn" className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> Create Coupon
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="admin-table-toolbar">
          <div className="admin-table-toolbar-left">
            <div className="input-group" style={{ width: 260 }}>
              <Search size={14} className="input-icon-left" />
              <input
                id="coupon-search"
                type="search"
                className="input input-sm"
                placeholder="Search by code…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 'var(--space-9)' }}
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: 'var(--space-12)' }}><Spinner fullPage /></div>
        ) : coupons.length === 0 ? (
          <div style={{ padding: 'var(--space-8)' }}>
            <EmptyState
              icon={Tag}
              title="No coupons yet"
              description="Create your first discount code to attract more customers."
            />
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Type / Value</th>
                  <th>Min Order</th>
                  <th>Uses</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {coupons.map(c => (
                  <tr key={c.id}>
                    <td>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 'var(--font-semibold)',
                        background: 'var(--color-surface-raised)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        letterSpacing: '0.05em',
                      }}>
                        {c.code}
                      </span>
                    </td>
                    <td>
                      <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>
                        {formatValue(c)}
                      </p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'capitalize' }}>
                        {c.type.replace('_', ' ')}
                      </p>
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                      {c.min_order_amount ? formatCurrency(c.min_order_amount, 'USD') : '—'}
                    </td>
                    <td style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                      {c.used_count}
                      {c.max_uses ? ` / ${c.max_uses}` : ''}
                    </td>
                    <td style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                      {c.expires_at ? formatDateShort(c.expires_at) : '—'}
                    </td>
                    <td>
                      <button
                        className={`badge ${c.is_active ? 'badge-success' : 'badge-neutral'}`}
                        style={{ cursor: 'pointer', border: 'none' }}
                        onClick={() => handleToggleActive(c)}
                        aria-label={c.is_active ? 'Deactivate coupon' : 'Activate coupon'}
                      >
                        {c.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          onClick={() => openEdit(c)}
                          aria-label={`Edit ${c.code}`}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          style={{ color: 'var(--red-500)' }}
                          onClick={() => setDeleting(c)}
                          aria-label={`Delete ${c.code}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CouponModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={load}
        editing={editing}
      />

      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete Coupon"
        message={`Delete coupon "${deleting?.code}"? This cannot be undone.`}
        confirmLabel="Delete"
      />
    </>
  );
}
