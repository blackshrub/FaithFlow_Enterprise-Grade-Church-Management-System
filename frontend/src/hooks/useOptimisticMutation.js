/**
 * React 19 Optimistic Mutation Hook
 *
 * Uses React 19's useOptimistic to provide instant UI feedback for form submissions.
 * Shows optimistic state immediately while the actual mutation is pending.
 *
 * Usage:
 *   const { optimisticState, isPending, submit } = useOptimisticMutation({
 *     mutationFn: async (data) => api.post('/endpoint', data),
 *     onSuccess: () => navigate('/success'),
 *     onError: (error) => toast.error(error.message)
 *   });
 *
 *   <Button disabled={isPending}>
 *     {isPending ? 'Submitting...' : 'Submit'}
 *   </Button>
 */
import { useOptimistic, useState, useCallback, useTransition } from 'react';

/**
 * Hook for optimistic form submissions
 * @param {Object} options
 * @param {Function} options.mutationFn - Async function to perform the mutation
 * @param {Function} options.onSuccess - Called on successful mutation
 * @param {Function} options.onError - Called on mutation error
 * @param {*} options.initialState - Initial optimistic state
 */
export function useOptimisticMutation({
  mutationFn,
  onSuccess,
  onError,
  initialState = null
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  // React 19's useOptimistic for instant UI updates
  const [optimisticState, setOptimisticState] = useOptimistic(
    initialState,
    (_, newState) => newState
  );

  const submit = useCallback(async (data, optimisticData) => {
    setError(null);

    // Immediately show optimistic state
    if (optimisticData !== undefined) {
      setOptimisticState(optimisticData);
    }

    startTransition(async () => {
      try {
        const result = await mutationFn(data);
        onSuccess?.(result, data);
      } catch (err) {
        setError(err);
        // Revert optimistic state on error by setting back to initial
        setOptimisticState(initialState);
        onError?.(err, data);
      }
    });
  }, [mutationFn, onSuccess, onError, initialState, setOptimisticState]);

  return {
    optimisticState,
    isPending,
    error,
    submit
  };
}

/**
 * Hook for optimistic form state with step progression
 * Useful for multi-step kiosk forms
 */
export function useOptimisticStep(initialStep = 0) {
  const [currentStep, setOptimisticStep] = useOptimistic(
    initialStep,
    (_, newStep) => newStep
  );
  const [isPending, startTransition] = useTransition();

  const goToStep = useCallback((step, asyncAction) => {
    setOptimisticStep(step);

    if (asyncAction) {
      startTransition(async () => {
        try {
          await asyncAction();
        } catch (error) {
          // Revert to previous step on error
          setOptimisticStep(initialStep);
          throw error;
        }
      });
    }
  }, [setOptimisticStep, initialStep]);

  return {
    currentStep,
    isPending,
    goToStep,
    setOptimisticStep
  };
}

export default useOptimisticMutation;
