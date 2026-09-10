import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { mediaApi } from '../../api';
import { Input } from './Field';
import Button from '../ui/Button';
import { toast } from '../../store/uiStore';

export default function ImagePicker({ value, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await mediaApi.upload(file);
      onChange(data.url);
      toast('Image uploaded');
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="row-gap" style={{ marginBottom: 8 }}>
        {value ? (
          <>
            <img src={value} alt="" className="thumb" style={{ width: 64, height: 64 }} />
            <Button variant="ghost" size="sm" icon={X} onClick={() => onChange('')}>
              Remove
            </Button>
          </>
        ) : (
          <span className="tiny muted">No image set</span>
        )}
      </div>

      <div className="row-gap" style={{ gap: 6 }}>
        <Input
          value={value || ''}
          placeholder="https://… or upload"
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1 }}
        />
        <Button variant="subtle" size="sm" icon={Upload} loading={uploading} onClick={() => inputRef.current?.click()}>
          Upload
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
