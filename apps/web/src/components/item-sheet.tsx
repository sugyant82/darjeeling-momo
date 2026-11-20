'use client';

import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { formatNZD, unitPriceCents } from '@darjeeling/shared';
import type { ItemOption, MenuItem, SelectedOption } from '@darjeeling/shared/types';
import { useT } from '@/lib/i18n';
import { useCart } from './cart-context';
import { useToast } from './toast-context';

type Selection = Record<string, string[]>; // optionId -> choiceIds

function defaultSelection(options: ItemOption[]): Selection {
  const sel: Selection = {};
  for (const opt of options) {
    const def = opt.choices.filter((c) => c.is_default).map((c) => c.id);
    sel[opt.id] = def.length > 0 ? def : opt.required && opt.choices[0] ? [opt.choices[0].id] : [];
  }
  return sel;
}

export function ItemSheet({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const { t } = useT();
  const cart = useCart();
  const toast = useToast();
  const [selection, setSelection] = useState<Selection>(() => defaultSelection(item.options));
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  // Closing plays the exit animation first; the parent unmounts the sheet once it finishes.
  const [closing, setClosing] = useState(false);
  const finishClose = useEffectEvent(() => onClose());

  useEffect(() => {
    if (!closing) return;
    // Matches the .is-closing animation length in globals.css (a timer, not animationend,
    // so the sheet still closes when animations are disabled).
    const t = setTimeout(finishClose, 240);
    return () => clearTimeout(t);
  }, [closing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setClosing(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const selectedOptions = useMemo<SelectedOption[]>(() => {
    const out: SelectedOption[] = [];
    for (const opt of item.options) {
      for (const choiceId of selection[opt.id] ?? []) {
        const choice = opt.choices.find((c) => c.id === choiceId);
        if (choice) {
          out.push({
            optionId: opt.id,
            optionName: opt.name,
            choiceId: choice.id,
            choiceLabel: choice.label,
            priceDeltaCents: choice.price_delta_cents,
          });
        }
      }
    }
    return out;
  }, [item.options, selection]);

  const unit = unitPriceCents(
    item.price_cents,
    selectedOptions.map((o) => o.priceDeltaCents),
  );

  const missingRequired = item.options.filter(
    (o) => o.required && (selection[o.id]?.length ?? 0) < Math.max(1, o.min_select),
  );

  function toggle(opt: ItemOption, choiceId: string) {
    setSelection((prev) => {
      const current = prev[opt.id] ?? [];
      if (opt.max_select <= 1) return { ...prev, [opt.id]: [choiceId] };
      if (current.includes(choiceId)) {
        return { ...prev, [opt.id]: current.filter((c) => c !== choiceId) };
      }
      if (current.length >= opt.max_select) return prev;
      return { ...prev, [opt.id]: [...current, choiceId] };
    });
  }

  async function add() {
    if (missingRequired.length > 0) return;
    setAdding(true);
    try {
      await cart.addItem(item, selectedOptions, quantity);
      toast.show(t('sheet.added', { n: quantity, name: item.name }), 'success');
      setClosing(true);
    } catch {
      toast.show(t('sheet.addError'), 'error');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div
      className={`sheet-backdrop${closing ? ' is-closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${item.name} options`}
      onClick={(e) => e.target === e.currentTarget && setClosing(true)}
    >
      <div className="sheet stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>{item.name}</h2>
          <button className="btn btn-ghost" aria-label={t('sheet.close')} onClick={() => setClosing(true)}>
            <X aria-hidden="true" />
          </button>
        </div>
        {item.description ? <p className="muted">{item.description}</p> : null}

        {item.options.map((opt) => (
          <fieldset key={opt.id} className="stack" style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={{ fontWeight: 700 }}>
              {opt.name}
              {opt.required ? <span className="muted"> · {t('sheet.required')}</span> : null}
              {opt.max_select > 1 ? (
                <span className="muted"> · {t('sheet.chooseUpTo', { n: opt.max_select })}</span>
              ) : null}
            </legend>
            {opt.choices.map((choice) => {
              const checked = (selection[opt.id] ?? []).includes(choice.id);
              return (
                <label
                  key={choice.id}
                  className="row card card-pad choice"
                  style={{ padding: 12, cursor: 'pointer', gap: 10 }}
                >
                  <input
                    type={opt.max_select <= 1 ? 'radio' : 'checkbox'}
                    name={opt.id}
                    checked={checked}
                    onChange={() => toggle(opt, choice.id)}
                  />
                  <span style={{ flex: 1 }}>{choice.label}</span>
                  {choice.price_delta_cents !== 0 ? (
                    <span className="muted">
                      {choice.price_delta_cents > 0 ? '+' : ''}
                      {formatNZD(choice.price_delta_cents)}
                    </span>
                  ) : null}
                </label>
              );
            })}
          </fieldset>
        ))}

        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700 }}>{t('sheet.quantity')}</span>
          <div className="row" style={{ gap: 12 }}>
            <button
              className="btn btn-outline"
              aria-label={t('sheet.decrease')}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Minus size={18} aria-hidden="true" />
            </button>
            <strong aria-live="polite" style={{ minWidth: 24, textAlign: 'center' }}>
              {quantity}
            </strong>
            <button
              className="btn btn-outline"
              aria-label={t('sheet.increase')}
              onClick={() => setQuantity((q) => Math.min(50, q + 1))}
            >
              <Plus size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        {missingRequired.length > 0 ? (
          <p className="muted">{t('sheet.pleaseChoose', { names: missingRequired.map((o) => o.name).join(', ') })}</p>
        ) : null}

        <button
          className="btn btn-action btn-lg btn-block"
          onClick={add}
          disabled={missingRequired.length > 0 || adding}
        >
          {adding ? t('sheet.adding') : t('sheet.add', { n: quantity, price: formatNZD(unit * quantity) })}
        </button>
      </div>
    </div>
  );
}
