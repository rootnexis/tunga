import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Globe, Truck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { PageSeo } from '@/components/shared/PageSeo';
import { Spinner } from '@/components/shared/Spinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { formatCurrency } from '@/utils/formatters';
import type { DeliveryMethod } from '@/types';

interface DeliveryZone {
  id: string;
  name: string;
  countries: string[];
  regions: string[];
}

// ── Zone Modal ─────────────────────────────────────────────────────────────
interface ZoneForm { name: string; countries: string; regions: string; }
const EMPTY_ZONE_FORM: ZoneForm = { name: '', countries: '', regions: '' };

interface ZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editing: DeliveryZone | null;
}

function ZoneModal({ isOpen, onClose, onSave, editing }: ZoneModalProps) {
  const { success, error: toastError } = useToast();
  const [form, setForm] = useState<ZoneForm>(EMPTY_ZONE_FORM);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNameError('');
      setForm(editing
        ? { name: editing.name, countries: editing.countries.join(', '), regions: editing.regions.join(', ') }
        : EMPTY_ZONE_FORM
      );
    }
  }, [isOpen, editing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setNameError('Name is required'); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      countries: form.countries.split(',').map(s => s.trim()).filter(Boolean),
      regions: form.regions.split(',').map(s => s.trim()).filter(Boolean),
    };
    const { error } = editing
      ? await supabase.from('delivery_zones').update(payload).eq('id', editing.id)
      : await supabase.from('delivery_zones').insert(payload);
    setSaving(false);
    if (error) { toastError('Save failed', error.message); return; }
    success(editing ? 'Zone updated' : 'Zone created');
    onSave();
    onClose();
  };

  if (!isOpen) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 480, width: '100%' }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={editing ? 'Edit Zone' : 'Add Zone'}
      >
        <div className="modal-header">
          <h2 className="modal-title">{editing ? 'Edit Zone' : 'Add Delivery Zone'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="zone-name">Zone Name <span className="form-required">*</span></label>
              <input
                id="zone-name"
                type="text"
                className={`input${nameError ? ' input-error' : ''}`}
                value={form.name}
                onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setNameError(''); }}
                placeholder="e.g. Europe, North America"
              />
              {nameError && <p className="form-error">{nameError}</p>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="zone-countries">Countries <span className="form-label-optional">(comma-separated ISO codes)</span></label>
              <input
                id="zone-countries"
                type="text"
                className="input"
                value={form.countries}
                onChange={e => setForm(p => ({ ...p, countries: e.target.value }))}
                placeholder="US, CA, GB"
              />
              <p className="form-hint">Leave empty to match all countries.</p>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="zone-regions">Regions <span className="form-label-optional">(comma-separated)</span></label>
              <input
                id="zone-regions"
                type="text"
                className="input"
                value={form.regions}
                onChange={e => setForm(p => ({ ...p, regions: e.target.value }))}
                placeholder="California, Texas"
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Zone'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Method Modal ───────────────────────────────────────────────────────────
interface MethodForm {
  name: string;
  description: string;
  zone_id: string;
  base_fee: string;
  free_above_amount: string;
  estimated_days_min: string;
  estimated_days_max: string;
  is_active: boolean;
}
const EMPTY_METHOD_FORM: MethodForm = {
  name: '', description: '', zone_id: '',
  base_fee: '0', free_above_amount: '',
  estimated_days_min: '', estimated_days_max: '',
  is_active: true,
};

function methodToForm(m: DeliveryMethod): MethodForm {
  return {
    name: m.name,
    description: m.description ?? '',
    zone_id: m.zone_id ?? '',
    base_fee: m.base_fee.toString(),
    free_above_amount: m.free_above_amount?.toString() ?? '',
    estimated_days_min: m.estimated_days_min?.toString() ?? '',
    estimated_days_max: m.estimated_days_max?.toString() ?? '',
    is_active: m.is_active,
  };
}

interface MethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editing: DeliveryMethod | null;
  zones: DeliveryZone[];
}

function MethodModal({ isOpen, onClose, onSave, editing, zones }: MethodModalProps) {
  const { success, error: toastError } = useToast();
  const [form, setForm] = useState<MethodForm>(EMPTY_METHOD_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof MethodForm, string>>>({});

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setForm(editing ? methodToForm(editing) : EMPTY_METHOD_FORM);
    }
  }, [isOpen, editing]);

  const set = (k: keyof MethodForm, v: string | boolean) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const validate = () => {
    const e: Partial<Record<keyof MethodForm, string>> = {};
    if (!form.name.trim()) e.name = 'Required';
    if (form.base_fee === '' || isNaN(Number(form.base_fee)) || Number(form.base_fee) < 0)
      e.base_fee = 'Must be 0 or more';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      zone_id: form.zone_id || null,
      base_fee: Number(form.base_fee),
      free_above_amount: form.free_above_amount ? Number(form.free_above_amount) : null,
      estimated_days_min: form.estimated_days_min ? Number(form.estimated_days_min) : null,
      estimated_days_max: form.estimated_days_max ? Number(form.estimated_days_max) : null,
      is_active: form.is_active,
    };
    const { error } = editing
      ? await supabase.from('delivery_methods').update(payload).eq('id', editing.id)
      : await supabase.from('delivery_methods').insert(payload);
    setSaving(false);
    if (error) { toastError('Save failed', error.message); return; }
    success(editing ? 'Method updated' : 'Method created');
    onSave();
    onClose();
  };

  if (!isOpen) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 520, width: '100%' }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={editing ? 'Edit Method' : 'Add Method'}
      >
        <div className="modal-header">
          <h2 className="modal-title">{editing ? 'Edit Delivery Method' : 'Add Delivery Method'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="method-name">Name <span className="form-required">*</span></label>
              <input
                id="method-name"
                type="text"
                className={`input${errors.name ? ' input-error' : ''}`}
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Standard Shipping"
              />
              {errors.name && <p className="form-error">{errors.name}</p>}
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label" htmlFor="method-desc">Description <span className="form-label-optional">(optional)</span></label>
              <input
                id="method-desc"
                type="text"
                className="input"
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Delivered in a plain box"
              />
            </div>

            {/* Zone */}
            <div className="form-group">
              <label className="form-label" htmlFor="method-zone">Delivery Zone <span className="form-label-optional">(optional)</span></label>
              <select
                id="method-zone"
                className="input"
                value={form.zone_id}
                onChange={e => set('zone_id', e.target.value)}
              >
                <option value="">All zones</option>
                {zones.map(z => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>

            {/* Fees */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="method-fee">
                  Base Fee <span className="form-label-optional">($)</span> <span className="form-required">*</span>
                </label>
                <input
                  id="method-fee"
                  type="number"
                  className={`input${errors.base_fee ? ' input-error' : ''}`}
                  value={form.base_fee}
                  onChange={e => set('base_fee', e.target.value)}
                  min="0"
                  step="0.01"
                />
                {errors.base_fee && <p className="form-error">{errors.base_fee}</p>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="method-free-above">
                  Free Above <span className="form-label-optional">($)</span>
                </label>
                <input
                  id="method-free-above"
                  type="number"
                  className="input"
                  value={form.free_above_amount}
                  onChange={e => set('free_above_amount', e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="Never free"
                />
              </div>
            </div>

            {/* Estimated days */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="method-days-min">Min Days</label>
                <input
                  id="method-days-min"
                  type="number"
                  className="input"
                  value={form.estimated_days_min}
                  onChange={e => set('estimated_days_min', e.target.value)}
                  min="0"
                  step="1"
                  placeholder="—"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="method-days-max">Max Days</label>
                <input
                  id="method-days-max"
                  type="number"
                  className="input"
                  value={form.estimated_days_max}
                  onChange={e => set('estimated_days_max', e.target.value)}
                  min="0"
                  step="1"
                  placeholder="—"
                />
              </div>
            </div>

            {/* Active toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  id="method-active"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => set('is_active', e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>Active</span>
              </label>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                Inactive methods won't appear at checkout
              </span>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Method'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function AdminDeliveryPage() {
  const { success, error: toastError } = useToast();
  const [zones, setZones]     = useState<DeliveryZone[]>([]);
  const [methods, setMethods] = useState<DeliveryMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleting, setDeleting] = useState<{ type: 'zone' | 'method'; id: string; name: string } | null>(null);

  // Zone modal state
  const [zoneModalOpen, setZoneModalOpen]  = useState(false);
  const [editingZone, setEditingZone]      = useState<DeliveryZone | null>(null);

  // Method modal state
  const [methodModalOpen, setMethodModalOpen] = useState(false);
  const [editingMethod, setEditingMethod]     = useState<DeliveryMethod | null>(null);

  const load = useCallback(async () => {
    const [{ data: z }, { data: m }] = await Promise.all([
      supabase.from('delivery_zones').select('*').order('name'),
      supabase.from('delivery_methods').select('*').order('base_fee'),
    ]);
    setZones((z as DeliveryZone[]) ?? []);
    setMethods((m as DeliveryMethod[]) ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (method: DeliveryMethod) => {
    await supabase.from('delivery_methods').update({ is_active: !method.is_active }).eq('id', method.id);
    success(method.is_active ? 'Method disabled' : 'Method enabled');
    load();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const table = deleting.type === 'zone' ? 'delivery_zones' : 'delivery_methods';
    const { error } = await supabase.from(table).delete().eq('id', deleting.id);
    if (error) { toastError('Could not delete', error.message); setDeleting(null); return; }
    success('Deleted successfully');
    setDeleting(null);
    load();
  };

  const openAddZone  = () => { setEditingZone(null);   setZoneModalOpen(true); };
  const openEditZone = (z: DeliveryZone) => { setEditingZone(z); setZoneModalOpen(true); };

  const openAddMethod  = () => { setEditingMethod(null);   setMethodModalOpen(true); };
  const openEditMethod = (m: DeliveryMethod) => { setEditingMethod(m); setMethodModalOpen(true); };

  if (isLoading) return <Spinner fullPage />;

  return (
    <>
      <PageSeo title="Delivery — Admin" />
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Delivery</h1>
          <p className="admin-page-desc">Manage delivery zones and shipping methods.</p>
        </div>
      </div>

      {/* Zones */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--space-5)' }}>
        <div style={{ padding: 'var(--space-5)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontWeight: 'var(--font-bold)' }}>Delivery Zones</h2>
          <button id="add-zone-btn" className="btn btn-secondary btn-sm" onClick={openAddZone}>
            <Plus size={14} /> Add Zone
          </button>
        </div>
        {zones.length === 0 ? (
          <div style={{ padding: 'var(--space-8)' }}>
            <EmptyState icon={Globe} title="No zones configured" description="Add a delivery zone to assign shipping methods." />
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead><tr><th>Zone Name</th><th>Countries</th><th></th></tr></thead>
              <tbody>
                {zones.map(zone => (
                  <tr key={zone.id}>
                    <td style={{ fontWeight: 'var(--font-medium)' }}>{zone.name}</td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>
                      {zone.countries.length > 0 ? zone.countries.join(', ') : 'All'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          onClick={() => openEditZone(zone)}
                          aria-label={`Edit ${zone.name}`}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          style={{ color: 'var(--red-500)' }}
                          onClick={() => setDeleting({ type: 'zone', id: zone.id, name: zone.name })}
                          aria-label={`Delete ${zone.name}`}
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

      {/* Methods */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-5)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontWeight: 'var(--font-bold)' }}>Delivery Methods</h2>
          <button id="add-method-btn" className="btn btn-secondary btn-sm" onClick={openAddMethod}>
            <Plus size={14} /> Add Method
          </button>
        </div>
        {methods.length === 0 ? (
          <div style={{ padding: 'var(--space-8)' }}>
            <EmptyState icon={Truck} title="No delivery methods" description="Add a method to enable checkout delivery options." />
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Zone</th>
                  <th>Base Fee</th>
                  <th>Free Above</th>
                  <th>Est. Days</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {methods.map(m => {
                  const zone = zones.find(z => z.id === m.zone_id);
                  return (
                    <tr key={m.id}>
                      <td>
                        <p style={{ fontWeight: 'var(--font-medium)', fontSize: 'var(--text-sm)' }}>{m.name}</p>
                        {m.description && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>{m.description}</p>}
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                        {zone?.name ?? '—'}
                      </td>
                      <td>{formatCurrency(m.base_fee, 'USD')}</td>
                      <td>{m.free_above_amount ? formatCurrency(m.free_above_amount, 'USD') : '—'}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>
                        {m.estimated_days_min && m.estimated_days_max
                          ? `${m.estimated_days_min}–${m.estimated_days_max} days`
                          : '—'}
                      </td>
                      <td>
                        <button
                          className={`badge${m.is_active ? ' badge-success' : ' badge-neutral'}`}
                          style={{ cursor: 'pointer', border: 'none' }}
                          onClick={() => toggleActive(m)}
                        >
                          {m.is_active ? 'Active' : 'Disabled'}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => openEditMethod(m)}
                            aria-label={`Edit ${m.name}`}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            style={{ color: 'var(--red-500)' }}
                            onClick={() => setDeleting({ type: 'method', id: m.id, name: m.name })}
                            aria-label={`Delete ${m.name}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <ZoneModal
        isOpen={zoneModalOpen}
        onClose={() => setZoneModalOpen(false)}
        onSave={load}
        editing={editingZone}
      />
      <MethodModal
        isOpen={methodModalOpen}
        onClose={() => setMethodModalOpen(false)}
        onSave={load}
        editing={editingMethod}
        zones={zones}
      />
      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title={`Delete ${deleting?.type === 'zone' ? 'Zone' : 'Method'}`}
        message={`Are you sure you want to delete "${deleting?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
      />
    </>
  );
}
