'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Clock, Home, Truck } from 'lucide-react';
import {
  createOrderInputSchema,
  createPayment,
  fetchProfile,
  formatNZD,
  formatSlotTime,
  formatWait,
  isItemAvailable,
  orderPrepMinutes,
  type CreatePaymentResponse,
  type PickupOption,
} from '@darjeeling/shared';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/components/auth-context';
import { useCart } from '@/components/cart-context';
import { useMenu, usePickupOptions } from '@/hooks/queries';
import { SignIn } from '@/components/sign-in';
import { MockPaymentSheet } from '@/components/mock-payment-sheet';
import { StripePaymentSheet } from '@/components/stripe-payment-sheet';
import { EmptyState, Spinner } from '@/components/ui';
import { useToast } from '@/components/toast-context';

export default function CheckoutPage() {
  const { t } = useT();
  const { user, loading } = useAuth();

  if (loading) return <Spinner label={t('ui.loading')} />;
  if (!user) {
    return (
      <div className="container">
        <Suspense fallback={null}>
          <SignIn next="/checkout" />
        </Suspense>
      </div>
    );
  }
  return <CheckoutForm userId={user.id} />;
}

function CheckoutForm({ userId }: { userId: string }) {
  const { t } = useT();
  const supabase = getBrowserSupabase();
  const router = useRouter();
  const toast = useToast();
  const cart = useCart();
  const { data: menu } = useMenu();

  // Prep time for this cart = the longest item prep time, read from the current menu.
  const prepByItem = useMemo(() => {
    const map = new Map<string, number>();
    for (const cat of menu ?? []) for (const it of cat.items) map.set(it.id, it.prep_minutes);
    return map;
  }, [menu]);
  const prepMinutes = useMemo(
    () => orderPrepMinutes(cart.lines.map((l) => ({ prepMinutes: prepByItem.get(l.menuItemId) ?? 0 }))),
    [cart.lines, prepByItem],
  );

  // Any cart item that's now unavailable or short on stock.
  const availabilityById = useMemo(() => {
    const map = new Map<string, { available: boolean; stock: number | null; name: string }>();
    for (const cat of menu ?? [])
      for (const it of cat.items)
        map.set(it.id, { available: isItemAvailable(it), stock: it.stock_qty, name: it.name });
    return map;
  }, [menu]);
  const stockProblem = cart.lines.find((l) => {
    const a = availabilityById.get(l.menuItemId);
    if (!a) return false;
    return !a.available || (a.stock != null && l.quantity > a.stock);
  });

  const { data: options, isLoading: optionsLoading } = usePickupOptions(prepMinutes);

  const [locationId, setLocationId] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [mode, setMode] = useState<'asap' | 'scheduled'>('asap');
  const [slotIso, setSlotIso] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [payment, setPayment] = useState<CreatePaymentResponse | null>(null);

  useEffect(() => {
    fetchProfile(supabase, userId).then((p) => {
      if (p?.phone) setPhone((prev) => prev || p.phone || '');
    });
  }, [supabase, userId]);

  // Default the location to the first one accepting orders.
  const selected: PickupOption | undefined = useMemo(() => {
    if (!options || options.length === 0) return undefined;
    return options.find((o) => o.schedule.id === locationId) ?? options.find((o) => o.accepting) ?? options[0];
  }, [options, locationId]);

  // Keep a chosen slot valid as time/fullness shifts.
  const availableSlots = (selected?.slots ?? []).filter((s) => !s.full);
  const chosenSlot = availableSlots.some((s) => s.startIso === slotIso) ? slotIso : '';
  const canOrder = Boolean(selected?.accepting) && availableSlots.length > 0 && !stockProblem;

  if (!cart.loading && cart.lines.length === 0 && !payment) {
    return (
      <div className="container">
        <EmptyState
          title={t('checkout.nothingTitle')}
          message={t('checkout.nothingBody')}
          action={
            <Link href="/menu" className="btn btn-action">
              {t('cart.browseMenu')}
            </Link>
          }
        />
      </div>
    );
  }

  async function submit() {
    if (!selected) return;
    const pickup =
      mode === 'asap'
        ? { pickupSlotIso: availableSlots[0]?.startIso ?? null, pickupAsap: true }
        : { pickupSlotIso: chosenSlot || null, pickupAsap: false };
    if (mode === 'scheduled' && !chosenSlot) {
      toast.show(t('checkout.chooseTimeError'), 'error');
      return;
    }

    const parsed = createOrderInputSchema.safeParse({
      items: cart.lines.map((l) => ({
        menuItemId: l.menuItemId,
        quantity: l.quantity,
        selectedOptions: l.selectedOptions,
      })),
      pickupSlotIso: pickup.pickupSlotIso,
      pickupAsap: pickup.pickupAsap,
      locationId: selected.schedule.id,
      phone,
      notes,
    });
    if (!parsed.success) {
      toast.show(parsed.error.issues[0]?.message ?? t('checkout.checkDetails'), 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createPayment(supabase, parsed.data);
      setPayment(res);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : t('checkout.couldNotStart'), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function onPaid() {
    await cart.clear();
    const orderId = payment?.orderId;
    setPayment(null);
    if (orderId) router.push(`/order/${orderId}`);
  }

  const noLocations = !optionsLoading && (!options || options.length === 0);

  return (
    <div className="container stack" style={{ gap: 24 }}>
      <h1>{t('checkout.title')}</h1>

      {stockProblem ? (
        <div className="banner banner-error">
          {t('checkout.stockProblem')}
        </div>
      ) : null}

      {optionsLoading ? (
        <Spinner label={t('checkout.checkingTimes')} />
      ) : noLocations ? (
        <div className="banner banner-warn">{t('checkout.noPickupToday')}</div>
      ) : (
        <>
          {/* Pickup location */}
          <section className="card card-pad stack">
            <h2>{t('checkout.pickup')}</h2>
            {options!.length > 1 ? (
              <div className="pickup-locations">
                {options!.map((opt) => (
                  <LocationChoice
                    key={opt.schedule.id}
                    opt={opt}
                    selected={selected?.schedule.id === opt.schedule.id}
                    onSelect={() => {
                      setLocationId(opt.schedule.id);
                      setSlotIso('');
                    }}
                  />
                ))}
              </div>
            ) : selected ? (
              <div className="stack" style={{ gap: 4 }}>
                <strong>
                  {selected.schedule.pickup_type === 'home' ? <Home size={16} /> : <Truck size={16} />}{' '}
                  {selected.schedule.place}
                </strong>
                <span className="muted">{selected.schedule.address}</span>
              </div>
            ) : null}

            {selected && !selected.accepting ? (
              <div className="banner banner-warn">
                {selected.open ? t('checkout.paused') : t('checkout.locationClosed')}
              </div>
            ) : null}

            {selected?.accepting ? (
              <PickupWhen
                option={selected}
                prepMinutes={prepMinutes}
                mode={mode}
                setMode={setMode}
                slotIso={chosenSlot}
                setSlotIso={setSlotIso}
                canOrder={canOrder}
              />
            ) : null}
          </section>

          {/* Contact */}
          <section className="card card-pad stack">
            <h2>{t('checkout.contact')}</h2>
            <div className="field">
              <label htmlFor="phone">{t('checkout.phone')}</label>
              <input
                id="phone"
                className="input"
                type="tel"
                inputMode="tel"
                placeholder="021 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="notes">{t('checkout.notes')}</label>
              <textarea
                id="notes"
                className="textarea"
                placeholder={t('checkout.notesPlaceholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
              />
            </div>
          </section>

          {/* Totals + pay */}
          <section className="card card-pad stack">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted">Subtotal (excl. GST)</span>
              <span>{formatNZD(cart.totals.subtotalCents)}</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted">GST (15%)</span>
              <span>{formatNZD(cart.totals.gstCents)}</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between', fontWeight: 800 }}>
              <span>Total</span>
              <span>{formatNZD(cart.totals.totalCents)}</span>
            </div>
            <button
              className="btn btn-primary btn-lg btn-block"
              onClick={submit}
              disabled={!canOrder || submitting || !phone}
            >
              {submitting ? t('checkout.starting') : t('checkout.pay', { price: formatNZD(cart.totals.totalCents) })}
            </button>
          </section>
        </>
      )}

      {payment?.provider === 'mock' ? (
        <MockPaymentSheet
          orderId={payment.orderId}
          amountCents={payment.amountCents}
          onPaid={onPaid}
          onCancel={() => setPayment(null)}
        />
      ) : null}
      {payment?.provider === 'stripe' ? (
        <StripePaymentSheet
          clientSecret={payment.clientSecret}
          publishableKey={payment.publishableKey}
          amountCents={payment.amountCents}
          onConfirmed={onPaid}
          onCancel={() => setPayment(null)}
        />
      ) : null}
    </div>
  );
}

function LocationChoice({
  opt,
  selected,
  onSelect,
}: {
  opt: PickupOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useT();
  const Icon = opt.schedule.pickup_type === 'home' ? Home : Truck;
  return (
    <button
      type="button"
      className={`pickup-loc${selected ? ' is-selected' : ''}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="pickup-loc-head">
        <Icon size={18} aria-hidden="true" />
        <span className="tag" style={{ background: 'var(--color-border)', color: 'var(--text)' }}>
          {t(opt.schedule.pickup_type === 'home' ? 'pickup.home' : 'pickup.truck')}
        </span>
        {!opt.accepting ? (
          <span className="muted">· {opt.open ? t('checkout.pausedShort') : t('checkout.closedShort')}</span>
        ) : null}
      </span>
      <strong>{opt.schedule.place}</strong>
      <span className="muted" style={{ fontSize: 'var(--text-label)' }}>
        {opt.schedule.address}
      </span>
    </button>
  );
}

function PickupWhen({
  option,
  prepMinutes,
  mode,
  setMode,
  slotIso,
  setSlotIso,
  canOrder,
}: {
  option: PickupOption;
  prepMinutes: number;
  mode: 'asap' | 'scheduled';
  setMode: (m: 'asap' | 'scheduled') => void;
  slotIso: string;
  setSlotIso: (s: string) => void;
  canOrder: boolean;
}) {
  const { t } = useT();
  const availableSlots = option.slots.filter((s) => !s.full);
  const earliest = availableSlots[0];
  const wait = formatWait(option.leadMinutes);

  return (
    <>
      <div className="banner banner-info row" style={{ gap: 8 }}>
        <Clock size={18} aria-hidden="true" />
        <span>
          {prepMinutes > 0 ? <>{t('checkout.prepNote', { wait })} </> : null}
          {earliest ? t('checkout.earliest', { time: earliest.label }) : t('checkout.noTimesLeft')}
        </span>
      </div>

      {availableSlots.length === 0 ? (
        <div className="banner banner-warn">{t('checkout.noTimes')}</div>
      ) : (
        <fieldset className="stack" style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 700 }}>{t('checkout.when')}</legend>
          <label className="row card card-pad" style={{ padding: 12, gap: 10 }}>
            <input
              type="radio"
              name="mode"
              checked={mode === 'asap'}
              onChange={() => setMode('asap')}
              disabled={!canOrder}
            />
            <span>
              {t('checkout.asap')}{' '}
              {earliest ? <span className="muted">({t('checkout.readyAround', { time: earliest.label })})</span> : null}
            </span>
          </label>
          <label className="row card card-pad" style={{ padding: 12, gap: 10 }}>
            <input
              type="radio"
              name="mode"
              checked={mode === 'scheduled'}
              onChange={() => setMode('scheduled')}
              disabled={!canOrder}
            />
            <span>{t('checkout.scheduleTime')}</span>
          </label>
          {mode === 'scheduled' ? (
            <div className="field">
              <label htmlFor="slot">{t('checkout.pickupTime')}</label>
              <select id="slot" className="select" value={slotIso} onChange={(e) => setSlotIso(e.target.value)}>
                <option value="">{t('checkout.chooseTime')}</option>
                {option.slots.map((s) => (
                  <option key={s.startIso} value={s.startIso} disabled={s.full}>
                    {formatSlotTime(s.startIso)}
                    {s.full ? ` — ${t('checkout.full')}` : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </fieldset>
      )}
    </>
  );
}
