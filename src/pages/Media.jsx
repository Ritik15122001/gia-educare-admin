import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Trash2, Copy, Image as ImageIcon } from 'lucide-react';
import { mediaApi } from '../api';
import { useAuthStore } from '../store/authStore';
import { confirmDialog, toast } from '../store/uiStore';
import { relativeTime } from '../utils/format';
import PageHeader from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

const kb = (bytes) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

export default function Media() {
  const queryClient = useQueryClient();
  const inputRef = useRef(null);
  const role = useAuthStore((s) => s.user?.role);
  const canDelete = ['super_admin', 'admin'].includes(role);

  const { data, isLoading } = useQuery({ queryKey: ['media'], queryFn: mediaApi.list });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['media'] });

  const upload = useMutation({
    mutationFn: (file) => mediaApi.upload(file),
    onSuccess: () => { invalidate(); toast('Uploaded'); },
    onError: (err) => toast(err.message, 'err'),
  });

  const remove = useMutation({
    mutationFn: (filename) => mediaApi.remove(filename),
    onSuccess: () => { invalidate(); toast('File deleted'); },
    onError: (err) => toast(err.message, 'err'),
  });

  const handleDelete = async (file) => {
    const confirmed = await confirmDialog({
      title: 'Delete file?',
      message: `${file.filename} will be removed. Anything still pointing at it will show a broken image.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (confirmed) remove.mutate(file.filename);
  };

  const files = data?.data || [];

  return (
    <>
      <PageHeader crumb="Site" title="Media" sub="Images available to team photos, destination cards and site settings.">
        <Button variant="gold" icon={Upload} loading={upload.isPending} onClick={() => inputRef.current?.click()}>
          Upload image
        </Button>
      </PageHeader>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload.mutate(file);
          e.target.value = '';
        }}
      />

      <Card>
        {isLoading ? (
          <Spinner />
        ) : !files.length ? (
          <EmptyState
            icon={ImageIcon}
            title="No images yet"
            message="Upload team photos or destination artwork and reference them from any content form."
            action={
              <Button variant="gold" icon={Upload} onClick={() => inputRef.current?.click()}>
                Upload image
              </Button>
            }
          />
        ) : (
          <div className="card-pad" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 14 }}>
            {files.map((file) => (
              <div key={file.filename} className="card" style={{ overflow: 'hidden' }}>
                <div style={{ background: '#F4F2EC', height: 130, display: 'grid', placeItems: 'center' }}>
                  <img src={file.url} alt={file.filename} style={{ maxHeight: 130, objectFit: 'contain' }} />
                </div>
                <div style={{ padding: 10 }}>
                  <div className="tiny" style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.filename}
                  </div>
                  <div className="tiny muted" style={{ marginBottom: 8 }}>
                    {kb(file.size)} · {relativeTime(file.uploadedAt)}
                  </div>
                  <div className="row-gap" style={{ gap: 5 }}>
                    <IconButton
                      icon={Copy}
                      label="Copy URL"
                      onClick={() => {
                        navigator.clipboard.writeText(file.url);
                        toast('URL copied');
                      }}
                    />
                    {canDelete && <IconButton icon={Trash2} label="Delete" onClick={() => handleDelete(file)} />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
