import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { resourceApi } from '../api';
import { toast } from '../store/uiStore';

/**
 * All the server state a resource screen needs: a paged list plus create,
 * update, delete, publish-toggle and reorder mutations that keep the cache
 * in sync.
 */
export function useResource(resource, params) {
  const queryClient = useQueryClient();
  const key = ['resource', resource, params];

  const list = useQuery({
    queryKey: key,
    queryFn: () => resourceApi.list(resource, params),
    placeholderData: (prev) => prev, // keep rows on screen while refetching
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['resource', resource] });

  const onError = (err) => toast(err.message, 'err');

  const create = useMutation({
    mutationFn: (payload) => resourceApi.create(resource, payload),
    onSuccess: () => {
      invalidate();
      toast('Created');
    },
    onError,
  });

  const update = useMutation({
    mutationFn: ({ id, payload }) => resourceApi.update(resource, id, payload),
    onSuccess: () => {
      invalidate();
      toast('Saved');
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: (id) => resourceApi.remove(resource, id),
    onSuccess: () => {
      invalidate();
      toast('Deleted');
    },
    onError,
  });

  const togglePublish = useMutation({
    mutationFn: (id) => resourceApi.togglePublish(resource, id),
    onSuccess: ({ data }) => {
      invalidate();
      toast(data.published ? 'Now visible on the site' : 'Hidden from the site');
    },
    onError,
  });

  const reorder = useMutation({
    mutationFn: (items) => resourceApi.reorder(resource, items),
    onSuccess: () => invalidate(),
    onError,
  });

  return { list, create, update, remove, togglePublish, reorder };
}
