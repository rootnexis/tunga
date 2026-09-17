import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, ArrowLeft, ArrowRight, CheckCircle, Tag, Truck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { PageSeo } from '@/components/shared/PageSeo';
import { Spinner } from '@/components/shared/Spinner';
import { formatCurrency, getEffectivePrice, generateIdempotencyKey } from '@/utils/formatters';
import type { Address, DeliveryMethod, Coupon } from '@/types';

type Step = 1 | 2 | 3 | 4 | 5;

const STEPS = ['Address', 'Delivery', 'Coupon', 'Review', 'Done'];

export default function CheckoutPage() {
  const { user } = useAuth();
  const { items, clearCart } = useCart();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [step, setStep]                     = useState<Step>(1);
  const [addresses, setAddresses]           = useState<Address[]>([]);
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryMethod | null>(null);
  const [couponCode, setCouponCode]         = useState('');
  const [coupon, setCoupon]                 = useState<Coupon | null>(null);
  const [couponError, setCouponError]       = useState('');
  const [applying, setApplying]             = useState(false);
  const [placing, setPlacing]               = useState(false);
  const [placedOrderId, setPlacedOrderId]   = useState<string | null>(null);
  const [isLoading, setIsLoading]           = useState(true);

  const PLACEHOLDER = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 52 52"><rect width="52" height="52" fill="#f1f5f9"/></svg>');

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('addresses').select('*').eq('user_id', user.id).order('is_default', { ascending: false }),
      supabase.from('delivery_methods').select('*').eq('is_active', true).order('base_fee'),
    ]).then(([{ data: addrs }, { data: methods }]) => {
      const a = (addrs as Address[]) ?? [];
      setAddresses(a);
      setSelectedAddress(a.find(x => x.is_default) ?? a[0] ?? null);
      const m = (methods as DeliveryMethod[]) ?? [];
      setDeliveryMethods(m);
      setSelectedDelivery(m[0] ?? null);
      setIsLoading(false);
    });
  }, [user]);

  if (items.length === 0 && step !== 5) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 'var(--space-4)', textAlign: 'center', padding: 'var(--space-8)' }}>
        <p style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)' }}>Your cart is empty</p>
        <Link to="/shop" className="btn btn-primary btn-lg">Browse Products</Link>
      </div>
    );
  }

  const subtotal      = items.reduce((s, i) => s + getEffectivePrice(i.product!) * i.quantity, 0);
  const deliveryFee   = selectedDelivery
    ? (subtotal >= (selectedDelivery.free_above_amount ?? Infinity) ? 0 : selectedDelivery.base_fee)
    : 0;
  const discountAmount = coupon
    ? coupon.type === 'percentage' ? Math.min(subtotal * (coupon.value / 100), coupon.max_discount_amount ?? Infinity)
    : coupon.type === 'fixed'       ? Math.min(coupon.value, subtotal)
    : coupon.type === 'free_shipping' ? deliveryFee : 0
    : 0;
  const tax     = (subtotal - discountAmount) * 0.1;
  const total   = subtotal + deliveryFee - discountAmount + tax;

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplying(true);
    setCouponError('');
    const { data, error } = await supabase.from('coupons')
      .select('*').eq('code', couponCode.trim().toUpperCase()).eq('is_active', true).single();
    setApplying(false);
    if (error || !data) { setCouponError('Invalid or expired coupon code.'); return; }
    const c = data as Coupon;
    if (c.min_order_amount && subtotal < c.min_order_amount) {
      setCouponError(`Minimum order of ${formatCurrency(c.min_order_amount)} required.`); return;
    }
    setCoupon(c);
  };

  const placeOrder = async () => {
    if (!user || !selectedAddress || !selectedDelivery) return;
    setPlacing(true);
    const idempotencyKey = generateIdempotencyKey();
    const { data: order, error } = await supabase.from('orders').insert({
      user_id: user.id,
      status: 'pending',
      subtotal,
      discount_amount: discountAmount,
      delivery_fee: deliveryFee,
      tax_amount: tax,
      total,
      currency: 'RWF',
      coupon_id: coupon?.id ?? null,
      delivery_method_id: selectedDelivery.id,
      shipping_address: selectedAddress,
    }).select('id, order_number').single();

    if (error || !order) {
      toastError('Order failed', error?.message ?? 'Please try again.');
      setPlacing(false);
      return;
    }

    // Insert order items
    await supabase.from('order_items').insert(
      items.map(i => ({
        order_id: order.id,
        product_id: i.product_id,
        variant_id: i.variant_id,
        product_name: i.product?.name ?? '',
        variant_name: i.variant?.name ?? null,
        sku: i.variant?.sku ?? i.product?.sku ?? '',
        unit_price: getEffectivePrice(i.product!),
        quantity: i.quantity,
        discount_amount: 0,
        line_total: getEffectivePrice(i.product!) * i.quantity,
      }))
    );

    await clearCart();
    setPlacedOrderId(order.id);
    setPlacing(false);
    setStep(5);
    success('Order placed!', `Order #${order.order_number} confirmed.`);
  };

  if (isLoading) return <Spinner fullPage />;

  return (
    <>
      <PageSeo title="Checkout" />

      {/* Header */}
      <div className="checkout-header">
        <div className="container checkout-header-inner">
          <Link to="/" className="auth-logo" style={{ fontSize: 'var(--text-base)' }}>
            <div className="auth-logo-icon" style={{ width: 30, height: 30 }}><Zap size={15} /></div>
            Storefront
          </Link>

          <div className="checkout-steps">
            {STEPS.slice(0, 4).map((label, i) => {
              const num = (i + 1) as Step;
              const done = step > num;
              const active = step === num;
              return (
                <React.Fragment key={label}>
                  {i > 0 && <div className="checkout-step-divider" />}
                  <div className={`checkout-step${active ? ' active' : done ? ' done' : ''}`}>
                    <div className="checkout-step-num">
                      {done ? <CheckCircle size={14} /> : num}
                    </div>
                    <span>{label}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          <Link to="/shop" className="btn btn-ghost btn-sm"><ArrowLeft size={14} /> Shop</Link>
        </div>
      </div>

      {step === 5 ? (
        /* ── Done ── */
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-8)' }}>
          <div style={{ textAlign: 'center', maxWidth: 480 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--emerald-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-5)' }}>
              <CheckCircle size={40} color="var(--emerald-500)" />
            </div>
            <h1 style={{ fontSize: 'var(--text-3xl)', fontFamily: 'var(--font-display)', fontWeight: 'var(--font-extrabold)', marginBottom: 'var(--space-3)' }}>
              Order Confirmed!
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-8)', lineHeight: 'var(--leading-relaxed)' }}>
              Thank you for your purchase. You'll receive a confirmation email shortly with tracking information.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
              {placedOrderId && <Link to={`/account/orders/${placedOrderId}`} className="btn btn-primary btn-lg">View Order</Link>}
              <Link to="/shop" className="btn btn-secondary btn-lg">Continue Shopping</Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="checkout-page" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="checkout-layout">
              {/* Main Panel */}
              <div>
                {/* Step 1 — Address */}
                {step === 1 && (
                  <div className="checkout-form-panel">
                    <div className="checkout-panel-header">
                      <div className="checkout-panel-num">1</div>
                      <h2 className="checkout-panel-title">Shipping Address</h2>
                    </div>
                    <div className="checkout-panel-body">
                      {addresses.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
                            You have no saved addresses.
                          </p>
                          <Link to="/account/addresses" className="btn btn-secondary">
                            Add an Address
                          </Link>
                        </div>
                      ) : (
                        addresses.map(addr => (
                          <div
                            key={addr.id}
                            className={`address-card${selectedAddress?.id === addr.id ? ' selected' : ''}`}
                            onClick={() => setSelectedAddress(addr)}
                          >
                            <input type="radio" checked={selectedAddress?.id === addr.id} onChange={() => setSelectedAddress(addr)} />
                            <div className="address-card-info">
                              {addr.label && <p className="address-card-label">{addr.label}</p>}
                              <p className="address-card-name">{addr.first_name} {addr.last_name}</p>
                              <p className="address-card-text">
                                {addr.address_line1}{addr.address_line2 && `, ${addr.address_line2}`}<br />
                                {addr.city}{addr.state && `, ${addr.state}`} {addr.postal_code}, {addr.country}
                              </p>
                            </div>
                            {addr.is_default && <span className="badge badge-neutral badge-sm">Default</span>}
                          </div>
                        ))
                      )}
                    </div>
                    <div className="checkout-panel-footer">
                      <span />
                      <button className="btn btn-primary" onClick={() => setStep(2)} disabled={!selectedAddress}>
                        Continue <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2 — Delivery */}
                {step === 2 && (
                  <div className="checkout-form-panel">
                    <div className="checkout-panel-header">
                      <div className="checkout-panel-num">2</div>
                      <h2 className="checkout-panel-title">Delivery Method</h2>
                    </div>
                    <div className="checkout-panel-body">
                      {deliveryMethods.length === 0 ? (
                        <p style={{ color: 'var(--color-text-secondary)' }}>No delivery methods available.</p>
                      ) : (
                        deliveryMethods.map(method => {
                          const free = subtotal >= (method.free_above_amount ?? Infinity);
                          const fee = free ? 0 : method.base_fee;
                          return (
                            <div
                              key={method.id}
                              className={`delivery-option${selectedDelivery?.id === method.id ? ' selected' : ''}`}
                              onClick={() => setSelectedDelivery(method)}
                            >
                              <input type="radio" checked={selectedDelivery?.id === method.id} onChange={() => setSelectedDelivery(method)} />
                              <div className="delivery-option-info">
                                <p className="delivery-option-name">{method.name}</p>
                                {method.description && <p className="delivery-option-desc">{method.description}</p>}
                                {(method.estimated_days_min || method.estimated_days_max) && (
                                  <p className="delivery-option-desc" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                    <Truck size={12} />
                                    {method.estimated_days_min}–{method.estimated_days_max} business days
                                  </p>
                                )}
                              </div>
                              <p className="delivery-option-price">
                                {fee === 0 ? <span style={{ color: 'var(--emerald-600)' }}>Free</span> : formatCurrency(fee, 'RWF')}
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <div className="checkout-panel-footer">
                      <button className="btn btn-ghost" onClick={() => setStep(1)}><ArrowLeft size={16} /> Back</button>
                      <button className="btn btn-primary" onClick={() => setStep(3)} disabled={!selectedDelivery}>
                        Continue <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3 — Coupon */}
                {step === 3 && (
                  <div className="checkout-form-panel">
                    <div className="checkout-panel-header">
                      <div className="checkout-panel-num">3</div>
                      <h2 className="checkout-panel-title">Discount Code</h2>
                    </div>
                    <div className="checkout-panel-body">
                      {coupon ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4)', background: 'var(--emerald-50)', border: '1px solid var(--emerald-100)', borderRadius: 'var(--radius-xl)' }}>
                          <CheckCircle size={20} color="var(--emerald-500)" />
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)' }}>{coupon.code} applied</p>
                            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--emerald-700)' }}>
                              Saving {formatCurrency(discountAmount, 'RWF')}
                            </p>
                          </div>
                          <button className="btn btn-ghost btn-sm" onClick={() => setCoupon(null)}>Remove</button>
                        </div>
                      ) : (
                        <div>
                          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
                            Have a discount code? Enter it below. Skip this step if you don't have one.
                          </p>
                          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                            <div className="input-group" style={{ flex: 1 }}>
                              <Tag size={16} className="input-icon-left" />
                              <input
                                type="text"
                                className={`input${couponError ? ' input-error' : ''}`}
                                placeholder="COUPON CODE"
                                value={couponCode}
                                onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                                style={{ textTransform: 'uppercase', paddingLeft: 'var(--space-9)' }}
                              />
                            </div>
                            <button className="btn btn-secondary" onClick={applyCoupon} disabled={applying || !couponCode.trim()}>
                              {applying ? 'Applying…' : 'Apply'}
                            </button>
                          </div>
                          {couponError && <p className="form-error" style={{ marginTop: 'var(--space-2)' }}>{couponError}</p>}
                        </div>
                      )}
                    </div>
                    <div className="checkout-panel-footer">
                      <button className="btn btn-ghost" onClick={() => setStep(2)}><ArrowLeft size={16} /> Back</button>
                      <button className="btn btn-primary" onClick={() => setStep(4)}>
                        Continue <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 4 — Review */}
                {step === 4 && (
                  <div className="checkout-form-panel">
                    <div className="checkout-panel-header">
                      <div className="checkout-panel-num">4</div>
                      <h2 className="checkout-panel-title">Review & Pay</h2>
                    </div>
                    <div className="checkout-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                      {/* Confirm address */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                          <p style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)' }}>Shipping to</p>
                          <button className="btn btn-ghost btn-sm" onClick={() => setStep(1)}>Edit</button>
                        </div>
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                          {selectedAddress?.first_name} {selectedAddress?.last_name}, {selectedAddress?.address_line1}, {selectedAddress?.city}, {selectedAddress?.country}
                        </p>
                      </div>
                      {/* Confirm delivery */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                          <p style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)' }}>Delivery method</p>
                          <button className="btn btn-ghost btn-sm" onClick={() => setStep(2)}>Edit</button>
                        </div>
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{selectedDelivery?.name}</p>
                      </div>
                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', padding: 'var(--space-3)', background: 'var(--amber-50)', border: '1px solid var(--amber-100)', borderRadius: 'var(--radius-lg)' }}>
                        💳 Payment integration coming soon. Clicking "Place Order" will create a pending order without charging you.
                      </p>
                    </div>
                    <div className="checkout-panel-footer">
                      <button className="btn btn-ghost" onClick={() => setStep(3)}><ArrowLeft size={16} /> Back</button>
                      <button className="btn btn-primary btn-lg" onClick={placeOrder} disabled={placing}>
                        {placing ? 'Placing order…' : `Place Order · ${formatCurrency(total, 'RWF')}`}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="checkout-summary">
                <p className="checkout-summary-header">Order Summary</p>
                <div className="checkout-summary-items">
                  {items.map(item => {
                    const img = item.product?.images?.find(i => i.is_primary) ?? item.product?.images?.[0];
                    return (
                      <div key={item.id} className="checkout-summary-item">
                        <img src={img?.url ?? PLACEHOLDER} alt={item.product?.name} className="checkout-summary-img" />
                        <div className="checkout-summary-info">
                          <p className="checkout-summary-name">{item.product?.name}</p>
                          <p className="checkout-summary-qty">× {item.quantity}</p>
                        </div>
                        <p className="checkout-summary-price">
                          {formatCurrency(getEffectivePrice(item.product!) * item.quantity, item.product?.currency ?? 'RWF')}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <div className="checkout-summary-totals">
                  <div className="checkout-totals-row"><span>Subtotal</span><span>{formatCurrency(subtotal, 'RWF')}</span></div>
                  <div className="checkout-totals-row"><span>Delivery</span><span>{deliveryFee === 0 ? <span style={{ color: 'var(--emerald-600)' }}>Free</span> : formatCurrency(deliveryFee, 'RWF')}</span></div>
                  {discountAmount > 0 && <div className="checkout-totals-row" style={{ color: 'var(--emerald-600)' }}><span>Discount</span><span>−{formatCurrency(discountAmount, 'RWF')}</span></div>}
                  <div className="checkout-totals-row"><span>Tax (10%)</span><span>{formatCurrency(tax, 'RWF')}</span></div>
                  <hr className="checkout-totals-divider" />
                  <div className="checkout-totals-row total"><span>Total</span><span>{formatCurrency(total, 'RWF')}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
