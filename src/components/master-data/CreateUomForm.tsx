'use client';

import { useEffect, useState } from 'react';

type Props = {
  busy: boolean;
  readOnly?: boolean;
  title?: string;
  submitLabel?: string;
  initialData?: { code?: string; name?: string; description?: string };
  onCancel?: () => void;
  onSubmit: (payload: { code: string; name: string; description?: string }) => Promise<void>;
};

export default function CreateUomForm({
  busy,
  readOnly = false,
  title = 'Unit of Measure',
  submitLabel = 'Create UOM',
  initialData,
  onCancel,
  onSubmit,
}: Props) {
  const [code, setCode] = useState('PCS');
  const [name, setName] = useState('Pieces');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!initialData) return;
    setCode(initialData.code ?? '');
    setName(initialData.name ?? '');
    setDescription(initialData.description ?? '');
  }, [initialData]);

  return (
    <>
      <h3 className="form-section-title">{title}</h3>
      <div className="form-grid">
        <div>
          <label htmlFor="md-uom-code">Code</label>
          <input
            id="md-uom-code"
            readOnly={readOnly}
            value={code}
            onChange={(e) => !readOnly && setCode(e.target.value)}
            placeholder="PCS"
          />
        </div>
        <div>
          <label htmlFor="md-uom-name">Name</label>
          <input
            id="md-uom-name"
            readOnly={readOnly}
            value={name}
            onChange={(e) => !readOnly && setName(e.target.value)}
            placeholder="Pieces"
          />
        </div>
        <div className="full-row">
          <label htmlFor="md-uom-description">Description</label>
          <textarea
            id="md-uom-description"
            rows={3}
            readOnly={readOnly}
            value={description}
            onChange={(e) => !readOnly && setDescription(e.target.value)}
            placeholder="Opsional"
          />
        </div>
      </div>
      {!readOnly ? (
        <div className="row">
          <button
            type="button"
            onClick={() => onSubmit({ code: code.trim(), name: name.trim(), description: description.trim() || undefined })}
            disabled={busy || !code.trim() || !name.trim()}
          >
            {submitLabel}
          </button>
          {onCancel ? (
            <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
              Cancel
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
