import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Pencil, FileText, Save } from 'lucide-react';
import { sectionApi } from '../api';
import { toast } from '../store/uiStore';
import PageHeader from '../components/layout/PageHeader';
import { Card, CardHead } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useCanModule } from '../store/authStore';
import IconButton from '../components/ui/IconButton';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { Field, Input, Textarea } from '../components/forms/Field';

// Group `home.hero` → "Home", `about.team` → "About" for a readable list.
const pageOf = (key) => key.split('.')[0];
const PAGE_LABELS = { home: 'Home', destinations: 'Destinations', courses: 'Courses', about: 'About', contact: 'Contact' };

function EditModal({ section, onClose, onSave, saving }) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      eyebrow: section?.eyebrow || '',
      title: section?.title || '',
      lead: section?.lead || '',
      ctaLabel: section?.ctaLabel || '',
    },
  });

  return (
    <Modal
      open={Boolean(section)}
      onClose={onClose}
      size="lg"
      title={section?.label || 'Edit section'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="gold" icon={Save} loading={saving} onClick={handleSubmit(onSave)}>Save copy</Button>
        </>
      }
    >
      <p className="tiny muted" style={{ marginBottom: 16 }}>
        Leave a field blank to fall back to the website's built-in copy. Use a <code className="mono">|</code> in the
        title to mark the gold accent phrase — e.g. <code className="mono">A counselling desk, |not a sales floor.</code>
      </p>
      <Field label="Eyebrow" hint="Small uppercase label above the heading.">
        <Input {...register('eyebrow')} />
      </Field>
      <Field label="Heading">
        <Textarea {...register('title')} rows={2} />
      </Field>
      <Field label="Lead paragraph">
        <Textarea {...register('lead')} rows={4} />
      </Field>
      <Field label="Button label" hint="Only used by sections with their own CTA.">
        <Input {...register('ctaLabel')} />
      </Field>
    </Modal>
  );
}

export default function Sections() {
  const canEdit = useCanModule('sections', 'edit');
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['sections'], queryFn: sectionApi.list });

  const save = useMutation({
    mutationFn: ({ id, payload }) => sectionApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      setEditing(null);
      toast('Section copy updated');
    },
    onError: (err) => toast(err.message, 'err'),
  });

  if (isLoading) return <Spinner label="Loading sections…" />;

  const sections = data?.data || [];
  const grouped = sections.reduce((acc, s) => {
    const page = pageOf(s.key);
    acc[page] = acc[page] || [];
    acc[page].push(s);
    return acc;
  }, {});

  return (
    <div className="content-narrow">
      <PageHeader
        crumb="Site"
        title="Section copy"
        sub="Headings and intro paragraphs for every section of the website, without touching code."
      />

      {!sections.length ? (
        <Card>
          <EmptyState icon={FileText} title="No sections yet" message="Run the backend seed to create the editable section list." />
        </Card>
      ) : (
        <div className="stack">
          {Object.entries(grouped).map(([page, items]) => (
            <Card key={page}>
              <CardHead title={PAGE_LABELS[page] || page} sub={`${items.length} section(s)`} />
              <div>
                {items.map((s) => (
                  <div className="list-row" key={s.id} style={{ alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="row-gap" style={{ gap: 8, marginBottom: 3 }}>
                        <strong style={{ fontSize: '.86rem' }}>{s.label.replace(/^.*— /, '')}</strong>
                        {s.eyebrow && <Badge tone="gold">{s.eyebrow}</Badge>}
                      </div>
                      <div className="tiny" style={{ color: 'var(--ink)' }}>{s.title || <span className="muted">Using built-in heading</span>}</div>
                      {s.lead && (
                        <div className="tiny muted" style={{ marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {s.lead}
                        </div>
                      )}
                    </div>
                    {canEdit && <IconButton icon={Pencil} label="Edit copy" onClick={() => setEditing(s)} />}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <EditModal
        section={editing}
        onClose={() => setEditing(null)}
        saving={save.isPending}
        onSave={(payload) => save.mutate({ id: editing.id, payload })}
      />
    </div>
  );
}
