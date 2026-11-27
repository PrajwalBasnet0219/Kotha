import { useState } from 'react';
import type { Product } from '../../lib/store';

type ProductDialogProps = {
  open: boolean;
  onClose: () => void;
  initial: Product | null;
  categories: string[];
  onSave: (input: {
    name: string;
    category: string;
    w: number;
    d: number;
    h: number;
    material: string;
    price: number;
    state: Product['state'];
  }) => void;
};

export function ProductDialog({ open, onClose, initial, categories, onSave }: ProductDialogProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(initial?.category ?? categories[0] ?? '');
  const [w, setW] = useState(String(initial?.w ?? 800));
  const [d, setD] = useState(String(initial?.d ?? 600));
  const [h, setH] = useState(String(initial?.h ?? 700));
  const [material, setMaterial] = useState(initial?.material ?? '');
  const [price, setPrice] = useState(String(initial?.price ?? 10000));
  const [state, setState] = useState<Product['state']>(initial?.state ?? 'published');

  // Reset when reopening with a different product.
  const [lastId, setLastId] = useState(initial?.id ?? null);
  if (open && (initial?.id ?? null) !== lastId) {
    setLastId(initial?.id ?? null);
    setName(initial?.name ?? '');
    setCategory(initial?.category ?? categories[0] ?? '');
    setW(String(initial?.w ?? 800));
    setD(String(initial?.d ?? 600));
    setH(String(initial?.h ?? 700));
    setMaterial(initial?.material ?? '');
    setPrice(String(initial?.price ?? 10000));
    setState(initial?.state ?? 'published');
  }

  if (!open) return null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    const nw = Number(w);
    const nd = Number(d);
    const nh = Number(h);
    const np = Number(price);
    if (!Number.isFinite(nw) || !Number.isFinite(nd) || !Number.isFinite(nh) || !Number.isFinite(np)) return;
    if (nw < 1 || nd < 1 || nh < 1) return;
    onSave({
      name: name.trim(),
      category,
      w: Math.round(nw),
      d: Math.round(nd),
      h: Math.round(nh),
      material: material.trim() || 'Unspecified',
      price: Math.round(np),
      state,
    });
    onClose();
  };

  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="product-dialog-title">
      <button type="button" className="dialog__scrim" aria-label="Close" onClick={onClose} />
      <div className="dialog__card dialog__card--wide">
        <div className="dialog__top">
          <span className="mono">{initial ? 'Edit product' : 'New product'}</span>
          <button type="button" className="dialog__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <h2 id="product-dialog-title" className="dialog__title dialog__title--small">
          {initial ? 'Revise the piece.' : 'Add a piece to the catalogue.'}
        </h2>
        <p className="dialog__lede">
          Dimensions are millimetres. The catalogue is a reference, not a storefront.
        </p>

        <form className="form" onSubmit={submit}>
          <div className="form__grid">
            <label className="field">
              <span className="mono">Name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Two-seat sofa" />
            </label>
            <label className="field">
              <span className="mono">Category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form__grid form__grid--3">
            <label className="field">
              <span className="mono">Width mm</span>
              <input type="number" value={w} onChange={(event) => setW(event.target.value)} />
            </label>
            <label className="field">
              <span className="mono">Depth mm</span>
              <input type="number" value={d} onChange={(event) => setD(event.target.value)} />
            </label>
            <label className="field">
              <span className="mono">Height mm</span>
              <input type="number" value={h} onChange={(event) => setH(event.target.value)} />
            </label>
          </div>

          <div className="form__grid">
            <label className="field">
              <span className="mono">Material</span>
              <input value={material} onChange={(event) => setMaterial(event.target.value)} placeholder="Wool, beech frame" />
            </label>
            <label className="field">
              <span className="mono">Budget guide · NPR</span>
              <input type="number" value={price} onChange={(event) => setPrice(event.target.value)} />
            </label>
          </div>

          <div className="form__grid">
            <label className="field">
              <span className="mono">State</span>
              <select value={state} onChange={(event) => setState(event.target.value as Product['state'])}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>

          <div className="form__actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--solid">
              {initial ? 'Save changes' : 'Add to catalogue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
