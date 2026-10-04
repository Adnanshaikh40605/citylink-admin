import { useState } from 'react';
import { ApiError, api } from '../api';

type Props = {
  label?: string;
  value: string;
  onChange: (url: string) => void;
};

export function ImageField({
  label = 'Thumbnail',
  value,
  onChange,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await api<{ url: string }>('/admin/uploads', {
        method: 'POST',
        body,
      });
      onChange(res.url);
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Upload failed.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="full">
      {label}
      <div className="image-field">
        <input
          type="url"
          placeholder="Paste image URL, or upload a file below"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="image-field-row">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={busy}
            onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          />
          {busy ? <span className="muted">Uploading...</span> : null}
        </div>
        {value ? (
          <img className="image-preview" src={value} alt="Thumbnail preview" />
        ) : null}
        {error ? <div className="error-box">{error}</div> : null}
      </div>
    </label>
  );
}
