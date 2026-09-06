import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, GripVertical, Star, Upload, X, Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { PageSeo } from '@/components/shared/PageSeo';
import { Spinner } from '@/components/shared/Spinner';
import { slugify } from '@/utils/formatters';
import type { Category, Brand } from '@/types';

// ── Types ──────────────────────────────────────────────────────────────────

interface VariantRow {
  id?: string;
  name: string;
  sku: string;
  price_modifier: string;
  attributes: string; // JSON string for simplicity
  is_active: boolean;
  _key: string; // local-only key for React
}

interface ImageRow {
  id?: string;
  url: string;
  storage_path: string;
  alt_text: string;
  is_primary: boolean;
  sort_order: number;
  _key: string;
  _uploading?: boolean;
}

interface FormState {
  name: string;
  slug: string;
  sku: string;
  short_description: string;
  description: string;
  base_price: string;
  sale_price: string;
  currency: string;
  weight_kg: string;
  dim_l: string;
  dim_w: string;
  dim_h: string;
  tags: string; // comma-separated
  category_id: string;
  brand_id: string;
  is_active: boolean;
  is_featured: boolean;
  is_archived: boolean;
  // Inventory
  quantity_available: string;
  low_stock_threshold: string;
}

const EMPTY_FORM: FormState = {
  name: '', slug: '', sku: '', short_description: '', description: '',
  base_price: '', sale_price: '', currency: 'USD',
  weight_kg: '', dim_l: '', dim_w: '', dim_h: '',
  tags: '', category_id: '', brand_id: '',
  is_active: true, is_featured: false, is_archived: false,
  quantity_available: '0', low_stock_threshold: '5',
};

const CURRENCIES = ['USD', 'EUR', 'GBP', 'MAD', 'SAR', 'AED', 'CAD', 'AUD'];

function newVariant(): VariantRow {
  return { name: '', sku: '', price_modifier: '0', attributes: '{}', is_active: true, _key: crypto.randomUUID() };
}

// ── Component ──────────────────────────────────────────────────────────────

export default function AdminProductFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [slugManual, setSlugManual] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load reference data ─────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      supabase.from('categories').select('id, name, slug').eq('is_active', true).order('name'),
      supabase.from('brands').select('id, name, slug').eq('is_active', true).order('name'),
    ]).then(([catRes, brandRes]) => {
      setCategories((catRes.data as Category[]) ?? []);
      setBrands((brandRes.data as Brand[]) ?? []);
    });
  }, []);

  // ── Load product for editing ────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const { data: p, error } = await supabase
        .from('products')
        .select(`
          *,
          images:product_images(*),
          variants:product_variants(*),
          inventory(*)
        `)
        .eq('id', id)
        .single();

      if (error || !p) { toastError('Product not found'); navigate('/admin/products'); return; }

      const inv = Array.isArray(p.inventory) ? p.inventory[0] : p.inventory;
      setForm({
        name: p.name ?? '',
        slug: p.slug ?? '',
        sku: p.sku ?? '',
        short_description: p.short_description ?? '',
        description: p.description ?? '',
        base_price: String(p.base_price ?? ''),
        sale_price: p.sale_price != null ? String(p.sale_price) : '',
        currency: p.currency ?? 'USD',
        weight_kg: p.weight_kg != null ? String(p.weight_kg) : '',
        dim_l: p.dimensions_cm?.l != null ? String(p.dimensions_cm.l) : '',
        dim_w: p.dimensions_cm?.w != null ? String(p.dimensions_cm.w) : '',
        dim_h: p.dimensions_cm?.h != null ? String(p.dimensions_cm.h) : '',
        tags: (p.tags ?? []).join(', '),
        category_id: p.category_id ?? '',
        brand_id: p.brand_id ?? '',
        is_active: p.is_active ?? true,
        is_featured: p.is_featured ?? false,
        is_archived: p.is_archived ?? false,
        quantity_available: inv ? String(inv.quantity_available) : '0',
        low_stock_threshold: inv ? String(inv.low_stock_threshold) : '5',
      });
      setSlugManual(true);

      setImages((p.images ?? []).sort((a: ImageRow, b: ImageRow) => a.sort_order - b.sort_order).map((img: ImageRow) => ({
        ...img, _key: img.id ?? crypto.randomUUID(),
      })));

      setVariants((p.variants ?? []).map((v: VariantRow) => ({
        ...v,
        price_modifier: String(v.price_modifier ?? '0'),
        attributes: typeof v.attributes === 'object' ? JSON.stringify(v.attributes) : (v.attributes ?? '{}'),
        _key: v.id ?? crypto.randomUUID(),
      })));

      setIsLoading(false);
    })();
  }, [id, isEdit, navigate, toastError]);

  // ── Field helpers ───────────────────────────────────────────────────────
  const set = (field: keyof FormState, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const onNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    set('name', e.target.value);
    if (!slugManual) set('slug', slugify(e.target.value));
  };

  // ── Image upload ────────────────────────────────────────────────────────
  const handleImageFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files).slice(0, 10);

    const placeholders: ImageRow[] = arr.map((_, i) => ({
      url: '', storage_path: '', alt_text: '', is_primary: false,
      sort_order: images.length + i, _key: crypto.randomUUID(), _uploading: true,
    }));
    setImages(prev => [...prev, ...placeholders]);

    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      const ext = file.name.split('.').pop();
      const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('product-images').upload(path, file, { upsert: false });
      if (upErr) { toastError('Upload failed', upErr.message); continue; }
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);

      setImages(prev => {
        const next = [...prev];
        const idx = next.findIndex(x => x._key === placeholders[i]._key);
        if (idx !== -1) {
          next[idx] = {
            ...next[idx],
            url: urlData.publicUrl,
            storage_path: path,
            _uploading: false,
            is_primary: prev.filter(x => !x._uploading).length === 0 && i === 0,
          };
        }
        return next;
      });
    }
  }, [images.length, toastError]);

  const setPrimary = (key: string) =>
    setImages(prev => prev.map(img => ({ ...img, is_primary: img._key === key })));

  const removeImage = async (img: ImageRow) => {
    if (img.storage_path) {
      await supabase.storage.from('product-images').remove([img.storage_path]);
    }
    if (img.id) {
      await supabase.from('product_images').delete().eq('id', img.id);
    }
    setImages(prev => prev.filter(x => x._key !== img._key));
  };

  // ── Save ────────────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // Validate
    if (!form.name.trim()) { toastError('Name is required'); setIsSaving(false); return; }
    if (!form.sku.trim()) { toastError('SKU is required'); setIsSaving(false); return; }
    if (!form.base_price || isNaN(Number(form.base_price))) { toastError('Valid base price is required'); setIsSaving(false); return; }

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name.trim()),
      sku: form.sku.trim(),
      short_description: form.short_description.trim() || null,
      description: form.description.trim() || null,
      base_price: Number(form.base_price),
      sale_price: form.sale_price !== '' ? Number(form.sale_price) : null,
      currency: form.currency,
      weight_kg: form.weight_kg !== '' ? Number(form.weight_kg) : null,
      dimensions_cm: (form.dim_l || form.dim_w || form.dim_h)
        ? { l: Number(form.dim_l) || 0, w: Number(form.dim_w) || 0, h: Number(form.dim_h) || 0 }
        : null,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      category_id: form.category_id || null,
      brand_id: form.brand_id || null,
      is_active: form.is_active,
      is_featured: form.is_featured,
      is_archived: form.is_archived,
    };

    let productId = id;

    if (isEdit) {
      const { error } = await supabase.from('products').update(payload).eq('id', id!);
      if (error) { toastError('Save failed', error.message); setIsSaving(false); return; }
    } else {
      const { data, error } = await supabase.from('products').insert(payload).select('id').single();
      if (error || !data) { toastError('Save failed', error?.message); setIsSaving(false); return; }
      productId = data.id;
    }

    // Inventory
    const invPayload = {
      quantity_available: parseInt(form.quantity_available) || 0,
      low_stock_threshold: parseInt(form.low_stock_threshold) || 5,
    };
    await supabase.from('inventory')
      .update(invPayload)
      .eq('product_id', productId!)
      .is('variant_id', null);

    // Images — upsert records
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (!img.url || img._uploading) continue;
      const imgPayload = {
        product_id: productId!,
        url: img.url,
        storage_path: img.storage_path,
        alt_text: img.alt_text || null,
        is_primary: img.is_primary,
        sort_order: i,
        variant_id: null,
      };
      if (img.id) {
        await supabase.from('product_images').update(imgPayload).eq('id', img.id);
      } else {
        const { data: newImg } = await supabase.from('product_images').insert(imgPayload).select('id').single();
        if (newImg) {
          setImages(prev => prev.map(x => x._key === img._key ? { ...x, id: newImg.id } : x));
        }
      }
    }

    // Variants — upsert
    for (const v of variants) {
      const vPayload = {
        product_id: productId!,
        name: v.name,
        sku: v.sku,
        price_modifier: Number(v.price_modifier) || 0,
        attributes: (() => { try { return JSON.parse(v.attributes); } catch { return {}; } })(),
        is_active: v.is_active,
      };
      if (v.id) {
        await supabase.from('product_variants').update(vPayload).eq('id', v.id);
      } else {
        await supabase.from('product_variants').insert(vPayload);
      }
    }

    success(isEdit ? 'Product updated' : 'Product created');
    navigate('/admin/products');
  };

  // ── Drag reorder for images ─────────────────────────────────────────────
  const dragIdx = useRef<number | null>(null);

  const onDragStart = (i: number) => { dragIdx.current = i; };
  const onDrop = (i: number) => {
    if (dragIdx.current === null || dragIdx.current === i) return;
    setImages(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx.current!, 1);
      next.splice(i, 0, moved);
      return next.map((x, idx) => ({ ...x, sort_order: idx }));
    });
    dragIdx.current = null;
  };

  if (isLoading) return <Spinner fullPage />;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      <PageSeo title={isEdit ? 'Edit Product — Admin' : 'New Product — Admin'} />

      <form onSubmit={handleSave} noValidate>
        {/* ── Header ── */}
        <div className="admin-page-header" style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Link to="/admin/products" className="btn btn-ghost btn-sm"><ArrowLeft size={16} /></Link>
            <div>
              <h1 className="admin-page-title">{isEdit ? 'Edit Product' : 'New Product'}</h1>
              <p className="admin-page-desc">{isEdit ? `Editing: ${form.name}` : 'Fill in the details below to add a new product.'}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Link to="/admin/products" className="btn btn-ghost">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? <><Loader2 size={14} className="spin" /> Saving…</> : (isEdit ? 'Save Changes' : 'Create Product')}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-5)', alignItems: 'start' }}>

          {/* ── Left column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

            {/* Basic Info */}
            <div className="card">
              <h2 className="card-section-title">Basic Information</h2>

              <div className="form-group">
                <label className="form-label">Product Name <span className="form-required">*</span></label>
                <input className="input" value={form.name} onChange={onNameChange} placeholder="e.g. Premium Wireless Headphones" required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Slug <span className="form-required">*</span></label>
                  <input className="input" value={form.slug}
                    onChange={e => { setSlugManual(true); set('slug', e.target.value); }}
                    placeholder="auto-generated-from-name" />
                  <p className="form-hint">URL: /product/{form.slug || '…'}</p>
                </div>
                <div className="form-group">
                  <label className="form-label">SKU <span className="form-required">*</span></label>
                  <input className="input" value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="WH-PRO-001" required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Short Description</label>
                <input className="input" value={form.short_description} onChange={e => set('short_description', e.target.value)} placeholder="One-line product summary…" maxLength={200} />
              </div>

              <div className="form-group">
                <label className="form-label">Full Description</label>
                <textarea className="input" rows={6} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Detailed product description, features, specs…" style={{ resize: 'vertical' }} />
              </div>

              <div className="form-group">
                <label className="form-label">Tags <span className="form-label-optional">(comma-separated)</span></label>
                <input className="input" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="wireless, bluetooth, audio" />
              </div>
            </div>

            {/* Pricing */}
            <div className="card">
              <h2 className="card-section-title">Pricing</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Base Price <span className="form-required">*</span></label>
                  <div className="input-group">
                    <span className="input-addon">{form.currency}</span>
                    <input type="number" className="input" value={form.base_price} min="0" step="0.01"
                      onChange={e => set('base_price', e.target.value)} placeholder="0.00" required style={{ paddingLeft: 'var(--space-14)' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Sale Price <span className="form-label-optional">(optional)</span></label>
                  <div className="input-group">
                    <span className="input-addon">{form.currency}</span>
                    <input type="number" className="input" value={form.sale_price} min="0" step="0.01"
                      onChange={e => set('sale_price', e.target.value)} placeholder="0.00" style={{ paddingLeft: 'var(--space-14)' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Currency</label>
                  <select className="input" value={form.currency} onChange={e => set('currency', e.target.value)}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              {form.sale_price && form.base_price && Number(form.sale_price) >= Number(form.base_price) && (
                <p style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>⚠ Sale price must be less than base price.</p>
              )}
            </div>

            {/* Images */}
            <div className="card">
              <h2 className="card-section-title">Images</h2>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
                Drag to reorder. Click <Star size={12} style={{ display: 'inline' }} /> to set the primary image.
              </p>

              {/* Upload zone */}
              <div
                className="image-upload-zone"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleImageFiles(e.dataTransfer.files); }}
              >
                <Upload size={24} style={{ color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-2)' }} />
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>Click or drag images here</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>PNG, JPG, WebP — max 5 MB each</p>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={e => handleImageFiles(e.target.files)} />

              {images.length > 0 && (
                <div className="image-grid" style={{ marginTop: 'var(--space-4)' }}>
                  {images.map((img, i) => (
                    <div
                      key={img._key}
                      className={`image-thumb${img.is_primary ? ' image-thumb-primary' : ''}`}
                      draggable
                      onDragStart={() => onDragStart(i)}
                      onDragOver={e => e.preventDefault()}
                      onDrop={() => onDrop(i)}
                    >
                      {img._uploading ? (
                        <div className="image-thumb-loading"><Loader2 size={20} className="spin" /></div>
                      ) : (
                        <img src={img.url} alt={img.alt_text || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                      <div className="image-thumb-actions">
                        <button type="button" className="image-thumb-btn" onClick={() => setPrimary(img._key)} title="Set primary">
                          <Star size={12} fill={img.is_primary ? 'currentColor' : 'none'} />
                        </button>
                        <GripVertical size={12} style={{ color: 'white', opacity: 0.7 }} />
                        <button type="button" className="image-thumb-btn image-thumb-delete" onClick={() => removeImage(img)} title="Remove">
                          <X size={12} />
                        </button>
                      </div>
                      <input
                        className="image-alt-input"
                        placeholder="Alt text…"
                        value={img.alt_text}
                        onChange={e => setImages(prev => prev.map(x => x._key === img._key ? { ...x, alt_text: e.target.value } : x))}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Variants */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                <div>
                  <h2 className="card-section-title" style={{ marginBottom: 0 }}>Variants</h2>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>e.g. different sizes, colors, or configurations</p>
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setVariants(prev => [...prev, newVariant()])}>
                  <Plus size={14} /> Add Variant
                </button>
              </div>

              {variants.length === 0 ? (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>No variants — single product configuration.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {variants.map((v, i) => (
                    <div key={v._key} style={{ background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', border: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Variant Name</label>
                          <input className="input input-sm" value={v.name} placeholder="e.g. Red / XL"
                            onChange={e => setVariants(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">SKU</label>
                          <input className="input input-sm" value={v.sku} placeholder="PROD-RED-XL"
                            onChange={e => setVariants(prev => prev.map((x, j) => j === i ? { ...x, sku: e.target.value } : x))} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Price +/-</label>
                          <input type="number" className="input input-sm" value={v.price_modifier} step="0.01"
                            onChange={e => setVariants(prev => prev.map((x, j) => j === i ? { ...x, price_modifier: e.target.value } : x))} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 'var(--space-3)', alignItems: 'center' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Attributes <span className="form-label-optional">(JSON)</span></label>
                          <input className="input input-sm" value={v.attributes} placeholder='{"color":"Red","size":"XL"}'
                            onChange={e => setVariants(prev => prev.map((x, j) => j === i ? { ...x, attributes: e.target.value } : x))} />
                        </div>
                        <label className="toggle-label" style={{ flexShrink: 0 }}>
                          <input type="checkbox" checked={v.is_active}
                            onChange={e => setVariants(prev => prev.map((x, j) => j === i ? { ...x, is_active: e.target.checked } : x))} />
                          <span>Active</span>
                        </label>
                        <button type="button" className="btn btn-ghost btn-sm btn-icon"
                          onClick={() => setVariants(prev => prev.filter((_, j) => j !== i))} aria-label="Remove variant">
                          <Trash2 size={14} style={{ color: 'var(--color-danger)' }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shipping */}
            <div className="card">
              <h2 className="card-section-title">Shipping & Dimensions</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Weight (kg)</label>
                  <input type="number" className="input" value={form.weight_kg} min="0" step="0.001"
                    onChange={e => set('weight_kg', e.target.value)} placeholder="0.000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Length (cm)</label>
                  <input type="number" className="input" value={form.dim_l} min="0"
                    onChange={e => set('dim_l', e.target.value)} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Width (cm)</label>
                  <input type="number" className="input" value={form.dim_w} min="0"
                    onChange={e => set('dim_w', e.target.value)} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Height (cm)</label>
                  <input type="number" className="input" value={form.dim_h} min="0"
                    onChange={e => set('dim_h', e.target.value)} placeholder="0" />
                </div>
              </div>
            </div>

          </div>{/* end left column */}

          {/* ── Right sidebar ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', position: 'sticky', top: 'calc(var(--admin-topbar-h, 56px) + var(--space-4))' }}>

            {/* Status */}
            <div className="card">
              <h2 className="card-section-title">Status</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {([
                  { field: 'is_active',   label: 'Active',    hint: 'Visible in the store' },
                  { field: 'is_featured', label: 'Featured',  hint: 'Shown on homepage' },
                  { field: 'is_archived', label: 'Archived',  hint: 'Hidden everywhere' },
                ] as const).map(({ field, label, hint }) => (
                  <label key={field} className="toggle-row">
                    <div>
                      <p style={{ fontWeight: 'var(--font-medium)', fontSize: 'var(--text-sm)' }}>{label}</p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{hint}</p>
                    </div>
                    <div className={`toggle ${form[field] ? 'toggle-on' : ''}`} onClick={() => set(field, !form[field])}>
                      <div className="toggle-thumb" />
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Category & Brand */}
            <div className="card">
              <h2 className="card-section-title">Organisation</h2>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="input" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
                  <option value="">— None —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Brand</label>
                <select className="input" value={form.brand_id} onChange={e => set('brand_id', e.target.value)}>
                  <option value="">— None —</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>

            {/* Inventory */}
            <div className="card">
              <h2 className="card-section-title">Inventory</h2>
              <div className="form-group">
                <label className="form-label">Quantity Available</label>
                <input type="number" className="input" value={form.quantity_available} min="0"
                  onChange={e => set('quantity_available', e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Low Stock Threshold</label>
                <input type="number" className="input" value={form.low_stock_threshold} min="0"
                  onChange={e => set('low_stock_threshold', e.target.value)} />
                <p className="form-hint">Alert when stock falls at or below this number.</p>
              </div>
            </div>

            {/* Save button (repeated for sidebar convenience) */}
            <button type="submit" className="btn btn-primary w-full" disabled={isSaving}>
              {isSaving ? <><Loader2 size={14} className="spin" /> Saving…</> : (isEdit ? 'Save Changes' : 'Create Product')}
            </button>
          </div>

        </div>
      </form>
    </>
  );
}
