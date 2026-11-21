'use client';

import { useEffect, useState } from 'react';
import { Home, Truck } from 'lucide-react';
import {
  deleteSchedule,
  fetchSchedules,
  PICKUP_TYPE_LABEL,
  scheduleInputSchema,
  upsertSchedule,
  zonedDateString,
  type PickupType,
} from '@darjeeling/shared';
import type { LocationScheduleRow } from '@darjeeling/shared/types';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { useToast } from '@/components/toast-context';
import { Spinner } from '@/components/ui';

type Form = {
  id?: string;
  date: string;
  pickupType: PickupType;
  place: string;
  address: string;
  mapLink: string;
  openTime: string;
  closeTime: string;
  slotMinutes: number;
  maxOrdersPerSlot: number;
  prepBufferMinutes: number;
  acceptingOrders: boolean;
  isClosed: boolean;
};

const BLANK = (date: string): Form => ({
  date,
  pickupType: 'home',
  place: '',
  address: '',
  mapLink: '',
  openTime: '10:00',
  closeTime: '20:00',
  slotMinutes: 15,
  maxOrdersPerSlot: 10,
  prepBufferMinutes: 0,
  acceptingOrders: true,
  isClosed: false,
});

function toForm(row: LocationScheduleRow): Form {
  return {
    id: row.id,
    date: row.date,
    pickupType: row.pickup_type,
    place: row.place,
    address: row.address,
    mapLink: row.map_link ?? '',
    openTime: row.open_time.slice(0, 5),
    closeTime: row.close_time.slice(0, 5),
    slotMinutes: row.slot_minutes,
    maxOrdersPerSlot: row.max_orders_per_slot,
    prepBufferMinutes: row.prep_buffer_minutes,
    acceptingOrders: row.accepting_orders,
    isClosed: row.is_closed,
  };
}

export default function ScheduleManagerPage() {
  const supabase = getBrowserSupabase();
  const toast = useToast();
  const today = zonedDateString();

  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState<LocationScheduleRow[]>([]);
  const [form, setForm] = useState<Form>(() => BLANK(today));

  async function load() {
    try {
      setUpcoming(await fetchSchedules(supabase, today));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    const parsed = scheduleInputSchema.safeParse({ ...form, mapLink: form.mapLink || null });
    if (!parsed.success) {
      toast.show(parsed.error.issues[0]?.message ?? 'Check the form.', 'error');
      return;
    }
    try {
      await upsertSchedule(supabase, parsed.data);
      toast.show('Schedule saved.', 'success');
      setForm(BLANK(form.date));
      load();
    } catch {
      toast.show('Could not save schedule. Check the date/type isn’t duplicated.', 'error');
    }
  }

  async function remove(row: LocationScheduleRow) {
    if (!confirm(`Remove ${PICKUP_TYPE_LABEL[row.pickup_type]} on ${row.date}?`)) return;
    try {
      await deleteSchedule(supabase, row.id);
      toast.show('Removed.', 'success');
      if (form.id === row.id) setForm(BLANK(today));
      load();
    } catch {
      toast.show('Could not remove.', 'error');
    }
  }

  if (loading) return <Spinner />;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Group upcoming by date so a day's home + truck sit together.
  const byDate = new Map<string, LocationScheduleRow[]>();
  for (const row of upcoming) {
    const list = byDate.get(row.date) ?? [];
    list.push(row);
    byDate.set(row.date, list);
  }

  return (
    <div className="stack">
      <h1>Schedule manager</h1>
      <p className="banner banner-info">
        Add a <strong>Home kitchen</strong> and/or a <strong>Food truck</strong> for a day — customers
        choose where to collect. The prep buffer and “accepting orders” switch are live dials you can
        change any time during service (also on the Orders board).
      </p>

      <section className="card card-pad stack">
        <h2>{form.id ? 'Edit location' : 'Add a location'}</h2>

        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: 1, minWidth: 160 }}>
            <label htmlFor="s-date">Date</label>
            <input id="s-date" type="date" className="input" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 220 }}>
            <label>Pickup type</label>
            <div className="row" style={{ gap: 8 }}>
              {(['home', 'truck'] as PickupType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`btn ${form.pickupType === t ? 'btn-primary' : 'btn-outline'}`}
                  aria-pressed={form.pickupType === t}
                  onClick={() => set('pickupType', t)}
                >
                  {t === 'home' ? <Home size={16} /> : <Truck size={16} />} {PICKUP_TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="row" style={{ gap: 8 }}>
          <input type="checkbox" checked={form.isClosed} onChange={(e) => set('isClosed', e.target.checked)} />
          Closed this day (don’t offer this location)
        </label>

        <div className="field">
          <label htmlFor="s-place">Place name</label>
          <input
            id="s-place"
            className="input"
            placeholder={form.pickupType === 'home' ? 'e.g. Our home kitchen, Ōtāhuhu' : 'e.g. Otara Flea Market'}
            value={form.place}
            onChange={(e) => set('place', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="s-addr">Address</label>
          <input id="s-addr" className="input" value={form.address} onChange={(e) => set('address', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="s-map">Map link (optional)</label>
          <input id="s-map" className="input" value={form.mapLink} onChange={(e) => set('mapLink', e.target.value)} />
        </div>

        <div className="row" style={{ gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="s-open">Open</label>
            <input id="s-open" type="time" className="input" value={form.openTime} onChange={(e) => set('openTime', e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="s-close">Close</label>
            <input id="s-close" type="time" className="input" value={form.closeTime} onChange={(e) => set('closeTime', e.target.value)} />
          </div>
        </div>

        <div className="row" style={{ gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="s-slot">Slot length (min)</label>
            <input id="s-slot" type="number" min={5} max={120} className="input" value={form.slotMinutes} onChange={(e) => set('slotMinutes', Number(e.target.value))} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="s-max">Max orders / slot</label>
            <input id="s-max" type="number" min={1} max={100} className="input" value={form.maxOrdersPerSlot} onChange={(e) => set('maxOrdersPerSlot', Number(e.target.value))} />
          </div>
        </div>

        <div className="row" style={{ gap: 12, alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="s-buffer">Prep buffer (min)</label>
            <input id="s-buffer" type="number" min={0} max={240} className="input" value={form.prepBufferMinutes} onChange={(e) => set('prepBufferMinutes', Number(e.target.value))} />
            <span className="muted" style={{ fontSize: 'var(--text-caption)' }}>
              Added to every order’s prep time when you’re busy.
            </span>
          </div>
          <label className="row" style={{ gap: 8, paddingBottom: 10 }}>
            <input type="checkbox" checked={form.acceptingOrders} onChange={(e) => set('acceptingOrders', e.target.checked)} />
            Accepting orders
          </label>
        </div>

        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-primary" onClick={save}>
            {form.id ? 'Save changes' : 'Add location'}
          </button>
          {form.id ? (
            <button className="btn btn-outline" onClick={() => setForm(BLANK(form.date))}>
              Cancel edit
            </button>
          ) : null}
        </div>
      </section>

      <section className="stack">
        <h2>Upcoming</h2>
        {byDate.size === 0 ? (
          <div className="banner banner-info">No schedule set yet. Add a location above.</div>
        ) : (
          Array.from(byDate.entries()).map(([date, rows]) => (
            <div key={date} className="card card-pad stack" style={{ gap: 10 }}>
              <strong>
                {date}
                {date === today ? ' · Today' : ''}
              </strong>
              {rows.map((row) => (
                <div key={row.id} className="row" style={{ justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div className="row" style={{ gap: 8, flex: 1, minWidth: 0 }}>
                    {row.pickup_type === 'home' ? <Home size={16} /> : <Truck size={16} />}
                    <span>
                      <strong>{PICKUP_TYPE_LABEL[row.pickup_type]}</strong> ·{' '}
                      {row.is_closed
                        ? 'Closed'
                        : `${row.place} · ${row.open_time.slice(0, 5)}–${row.close_time.slice(0, 5)}`}
                      {!row.is_closed && !row.accepting_orders ? ' · ⏸ paused' : ''}
                      {!row.is_closed && row.prep_buffer_minutes > 0 ? ` · +${row.prep_buffer_minutes}m buffer` : ''}
                    </span>
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <button className="btn btn-outline" onClick={() => setForm(toForm(row))}>
                      Edit
                    </button>
                    <button className="btn btn-danger" onClick={() => remove(row)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
