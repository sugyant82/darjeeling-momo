'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  centsToDollars,
  deleteMenuItem,
  dollarsToCents,
  formatNZD,
  setItemAvailability,
  upsertMenuItem,
} from '@darjeeling/shared';
import type { Category, MenuItem, Tag } from '@darjeeling/shared/types';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { useMenu } from '@/hooks/queries';
import { Spinner, ErrorState, TagBadge } from '@/components/ui';
import { useToast } from '@/components/toast-context';

const ALL_TAGS: Tag[] = ['veg', 'spicy', 'bestseller'];

export default function MenuManagerPage() {
  const { data: menu, isLoading, isError, refetch } = useMenu();
  const [editing, setEditing] = useState<MenuItem | 'new' | null>(null);

  if (isLoading) return <Spinner />;
  if (isError || !menu) return <ErrorState onRetry={() => refetch()} />;

  const categories = menu;

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Menu manager</h1>
        <button className="btn btn-action" onClick={() => setEditing('new')}>
          Add item
        </button>
      </div>
      <p className="banner banner-info">
        Sample items are marked SAMPLE in their description. Replace them with your real menu.
      </p>

      {categories.map((cat) => (
        <section key={cat.id} className="stack">
          <h2>{cat.name}</h2>
          {cat.items.map((item) => (
            <div key={item.id} className="card card-pad row" style={{ justifyContent: 'space-between' }}>
              <div>
                <strong>{item.name}</strong> · {formatNZD(item.price_cents)}
                <div className="row" style={{ gap: 6, marginTop: 4 }}>
                  {item.tags.map((t) => (
                    <TagBadge key={t} tag={t} />
                  ))}
                </div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <AvailabilityToggle item={item} onDone={() => refetch()} />
                <button className="btn btn-outline" onClick={() => setEditing(item)}>
                  Edit
                </button>
              </div>
            </div>
          ))}
        </section>
      ))}

      {editing ? (
        <ItemEditor
          item={editing === 'new' ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refetch();
          }}
        />
      ) : null}
    </div>
  );
}

function AvailabilityToggle({ item, onDone }: { item: MenuItem; onDone: () => void }) {
  const supabase = getBrowserSupabase();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={`btn ${item.is_available ? 'btn-success' : 'btn-danger'}`}
      disabled={busy}
      aria-pressed={item.is_available}
      onClick={async () => {
        setBusy(true);
        try {
          await setItemAvailability(supabase, item.id, !item.is_available);
          onDone();
        } catch {
          toast.show('Could not update availability.', 'error');
        } finally {
          setBusy(false);
        }
      }}
    >
      {item.is_available ? 'Available' : 'Sold out'}
    </button>
  );
}

function ItemEditor({
  item,
  categories,
  onClose,
  onSaved,
}: {
  item: MenuItem | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = getBrowserSupabase();
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState(item?.name ?? '');
  const [categoryId, setCategoryId] = useState(item?.category_id ?? categories[0]?.id ?? '');
  const [price, setPrice] = useState(item ? String(centsToDollars(item.price_cents)) : '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [tags, setTags] = useState<Tag[]>((item?.tags as Tag[]) ?? []);
  const [available, setAvailable] = useState(item?.is_available ?? true);
  const [imageUrl, setImageUrl] = useState<string | null>(item?.image_url ?? null);
  const [saving, setSaving] = useState(false);

  const priceCents = useMemo(() => {
    const n = Number.parseFloat(price);
    return Number.isFinite(n) ? dollarsToCents(n) : NaN;
  }, [price]);

  async function uploadImage(file: File) {
    const path = `items/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '_')}`;
    const { error } = await supabase.storage.from('menu-photos').upload(path, file, { upsert: true });
    if (error) {
      toast.show('Image upload failed.', 'error');
      return;
    }
    const { data } = supabase.storage.from('menu-photos').getPublicUrl(path);
    setImageUrl(data.publicUrl);
  }

  async function save() {
    if (!name || !categoryId || !Number.isFinite(priceCents)) {
      toast.show('Name, category and a valid price are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      await upsertMenuItem(supabase, {
        id: item?.id,
        categoryId,
        name,
        description,
        priceCents,
        tags,
        isAvailable: available,
        imageUrl,
        sort: item?.sort ?? 0,
      });
      qc.invalidateQueries({ queryKey: ['menu'] });
      toast.show('Item saved.', 'success');
      onSaved();
    } catch {
      toast.show('Could not save item.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!item) return;
    if (!window.confirm(`Delete ${item.name}?`)) return;
    try {
      await deleteMenuItem(supabase, item.id);
      qc.invalidateQueries({ queryKey: ['menu'] });
      onSaved();
    } catch {
      toast.show('Could not delete item.', 'error');
    }
  }

  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Edit menu item">
      <div className="sheet stack">
        <h2>{item ? 'Edit item' : 'Add item'}</h2>
        <div className="field">
          <label htmlFor="i-name">Name</label>
          <input id="i-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="i-cat">Category</label>
          <select id="i-cat" className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="i-price">Price (NZD)</label>
          <input
            id="i-price"
            className="input"
            inputMode="decimal"
            placeholder="12.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="i-desc">Description</label>
          <textarea id="i-desc" className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <fieldset className="stack" style={{ border: 'none', padding: 0 }}>
          <legend style={{ fontWeight: 700 }}>Tags</legend>
          <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
            {ALL_TAGS.map((t) => (
              <label key={t} className="row" style={{ gap: 6 }}>
                <input
                  type="checkbox"
                  checked={tags.includes(t)}
                  onChange={(e) =>
                    setTags((prev) => (e.target.checked ? [...prev, t] : prev.filter((x) => x !== t)))
                  }
                />
                {t}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="row" style={{ gap: 8 }}>
          <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
          Available
        </label>
        <div className="field">
          <label htmlFor="i-img">Photo</label>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" style={{ height: 100, width: 'auto', borderRadius: 8 }} />
          ) : null}
          <input
            id="i-img"
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
          />
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          {item ? (
            <button className="btn btn-danger" onClick={remove}>
              Delete
            </button>
          ) : null}
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
