import { useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';

interface OptimisticMutationOptions<TData, TVariables> {
  queryKey: QueryKey;
  mutationFn: (variables: TVariables) => Promise<TData>;
  optimisticUpdate: (oldData: any, variables: TVariables) => any;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * A custom hook for performing optimistic mutations with react-query.
 * It handles updating the UI instantly, rolling back on error, and re-fetching data.
 * @param options - Configuration for the mutation.
 * @returns A mutation object from react-query.
 */
export function useOptimisticMutation<TData = unknown, TVariables = unknown>({
  queryKey,
  mutationFn,
  optimisticUpdate,
  successMessage = 'Action completed successfully!',
  errorMessage = 'An error occurred. Your changes have been reverted.',
}: OptimisticMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    // When the mutation is called...
    onMutate: async (variables: TVariables) => {
      // 1. Cancel any outgoing re-fetches so they don't overwrite our optimistic update.
      await queryClient.cancelQueries({ queryKey });

      // 2. Snapshot the previous value.
      const previousData = queryClient.getQueryData(queryKey);

      // 3. Optimistically update to the new value.
      queryClient.setQueryData(queryKey, (oldData: any) =>
        optimisticUpdate(oldData, variables)
      );

      // 4. Return a context object with the snapshotted value.
      return { previousData };
    },
    // If the mutation fails...
    onError: (err, variables, context) => {
      // 5. Roll back to the previous value.
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error(errorMessage);
      console.error('Optimistic mutation failed:', err);
    },
    // On success...
    onSuccess: () => {
      if (successMessage) {
        toast.success(successMessage);
      }
    },
    // Always after success or error...
    onSettled: () => {
      // 6. Invalidate the query to re-fetch fresh data from the server.
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
