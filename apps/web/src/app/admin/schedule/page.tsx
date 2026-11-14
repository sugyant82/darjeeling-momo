'use client';

import { useEffect, useState } from 'react';
import {
  fetchSchedules,
  scheduleInputSchema,
  upsertSchedule,
  zonedDateString,
} from '@darjeeling/shared';
import type { LocationScheduleRow } from '@darjeeling/shared/types';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { useToast } from '@/components/toast-context';
import { Spinner } from '@/components/ui';

export default function ScheduleManagerPage() {
  const supabase = getBrowserSupabase();
  const toast = useToast();
  const today = zonedDateString();

  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState<LocationScheduleRow[]>([]);
  const [form, setForm] = useState({
    date: today,
    place: '',
    address: '',
    mapLink: '',
    openTime: '10:00',
    closeTime: '20:00',
    slotMinutes: 15,
    maxOrdersPerSlot: 10,
    isClosed: false,
  });

  async function load() {
    try {
      const rows = await fetchSchedules(supabase, today);
      setUpcoming(rows);
      const todays = rows.find((r) => r.date === today);
      if (todays) {
        setForm({
          date: todays.date,
          place: todays.place,
          address: todays.address,
          mapLink: todays.map_link ?? '',
          openTime: todays.open_time.slice(0, 5),
          closeTime: todays.close_time.slice(0, 5),
          slotMinutes: todays.slot_minutes,
          maxOrdersPerSlot: todays.max_orders_per_slot,
          isClosed: todays.is_closed,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    const parsed = scheduleInputSchema.safeParse({
      ...form,
      mapLink: form.mapLink || null,
    });
    if (!parsed.success) {
      toast.show(parsed.error.issues[0]?.message ?? 'Check the form.', 'error');
      return;
    }
    try {
      await upsertSchedule(supabase, parsed.data);
      toast.show('Schedule saved.', 'success');
      load();
    } catch {
      toast.show('Could not save schedule.', 'error');
    }
  }

  if (loading) return <Spinner />;

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="stack">
      <h1>Schedule manager</h1>

      <section className="card card-pad stack">
        <h2>Set a day</h2>
        <div className="field">
          <label htmlFor="s-date">Date</label>
          <input id="s-date" type="date" className="input" value={form.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <label className="row" style={{ gap: 8 }}>
          <input type="checkbox" checked={form.isClosed} onChange={(e) => set('isClosed', e.target.checked)} />
          Closed this day
        </label>
        <div className="field">
          <label htmlFor="s-place">Place</label>
          <input id="s-place" className="input" value={form.place} onChange={(e) => set('place', e.target.value)} />
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
            <input
              id="s-slot"
              type="number"
              className="input"
              value={form.slotMinutes}
              onChange={(e) => set('slotMinutes', Number(e.target.value))}
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="s-max">Max orders / slot</label>
            <input
              id="s-max"
              type="number"
              className="input"
              value={form.maxOrdersPerSlot}
              onChange={(e) => set('maxOrdersPerSlot', Number(e.target.value))}
            />
          </div>
        </div>
        <button className="btn btn-primary" onClick={save}>
          Save schedule
        </button>
      </section>

      <section className="stack">
        <h2>Upcoming</h2>
        {upcoming.length === 0 ? (
          <div className="banner banner-info">No schedule set yet.</div>
        ) : (
          upcoming.map((row) => (
            <div key={row.id} className="card card-pad">
              <strong>{row.date}</strong> —{' '}
              {row.is_closed ? 'Closed' : `${row.place} · ${row.open_time.slice(0, 5)}–${row.close_time.slice(0, 5)}`}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
