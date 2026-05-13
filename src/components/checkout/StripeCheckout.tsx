/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import {
  Button,
  Flash,
  FormControl,
  Label,
  ProgressBar,
  Spinner,
  Text,
  useTheme,
} from '@primer/react';
import { DotFillIcon } from '@primer/octicons-react';
import { Box } from '@datalayer/primer-addons';
import type { Stripe, StripeElementsOptions } from '@stripe/stripe-js';
import { useCache } from '../../hooks';
import type { ICheckoutPortal } from '../../models';

/**
 * Price item interface
 */
export interface IPrice {
  /**
   * Price ID
   */
  id: string;
  /**
   * Price user readable name
   */
  name: string;
  /**
   * Cost in cents
   */
  amount: number;
  /**
   * Cost currency
   */
  currency: string;
  /**
   * Computational credits to receive
   */
  credits: number;
}

export interface ISubscriptionPlan {
  id: string;
  name: string;
  amount: number;
  currency: string;
  interval?: string;
  included_runs?: number;
  included_credits?: number;
}

export type StripeCheckoutProps = {
  checkoutPortal: ICheckoutPortal | null;
  appearance?: StripeElementsOptions['appearance'];
  accountUid?: string;
};

const PLAN_INCLUDED_RUNS_DEFAULTS: Record<string, number> = {
  starter: 500,
  free: 500,
  team: 5000,
  pro: 5000,
  enterprise: 50000,
};

const asNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const asPositiveNumber = (value: unknown): number | null => {
  const parsed = asNumber(value);
  return parsed !== null && parsed > 0 ? parsed : null;
};

const asNonNegativeNumber = (value: unknown): number | null => {
  const parsed = asNumber(value);
  return parsed !== null && parsed >= 0 ? parsed : null;
};

const buildUsageSegments = (
  used: number,
  total: number,
): {
  inQuotaPct: number;
  remainingPct: number;
  overPct: number;
} => {
  const safeUsed = Math.max(0, used);
  const safeTotal = Math.max(0, total);
  const denominator = Math.max(1, safeUsed, safeTotal);

  const inQuota = Math.min(safeUsed, safeTotal);
  const remaining = Math.max(0, safeTotal - safeUsed);
  const over = Math.max(0, safeUsed - safeTotal);

  return {
    inQuotaPct: (inQuota / denominator) * 100,
    remainingPct: (remaining / denominator) * 100,
    overPct: (over / denominator) * 100,
  };
};

type StripePaymentFormProps = {
  clientSecret: string;
  intentType?: 'payment' | 'setup';
  onPaymentSucceeded: () => void;
};

function StripePaymentForm({
  clientSecret,
  intentType = 'payment',
  onPaymentSucceeded,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { colorScheme, resolvedColorScheme } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const themeIsDark = useMemo(() => {
    const scheme = (resolvedColorScheme || colorScheme || '').toLowerCase();
    if (scheme.includes('dark')) {
      return true;
    }
    if (scheme.includes('light')) {
      return false;
    }
    return false;
  }, [colorScheme, resolvedColorScheme]);

  const cardOptions = useMemo(() => {
    const rootStyles =
      typeof window !== 'undefined'
        ? getComputedStyle(document.documentElement)
        : null;
    const detectDarkMode = () => {
      if (themeIsDark) {
        return true;
      }
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return false;
      }
      const candidates: (Element | null)[] = [
        document.documentElement,
        document.body,
      ];
      for (const el of candidates) {
        const mode = el?.getAttribute('data-color-mode');
        if (mode === 'dark') {
          return true;
        }
        if (mode === 'light') {
          return false;
        }
      }
      for (const el of candidates) {
        const darkTheme = el?.getAttribute('data-dark-theme');
        if (
          darkTheme &&
          darkTheme !== 'light' &&
          (el?.getAttribute('data-color-mode') || 'auto') === 'auto' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches
        ) {
          return true;
        }
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    };
    const isDarkMode = detectDarkMode();
    const fontFamily =
      rootStyles?.getPropertyValue('--base-text-font-family')?.trim() ||
      'system-ui, -apple-system, Segoe UI, sans-serif';
    // Stripe's CardElement renders in an iframe that does not inherit our CSS
    // variables, so reading them from documentElement does not always reflect
    // the active theme. Use explicit dark/light values so typed characters are
    // always readable.
    const baseColor = isDarkMode ? '#f0f6fc' : '#1f2328';
    const mutedColor = isDarkMode ? '#8b949e' : '#59636e';
    return {
      style: {
        base: {
          color: baseColor,
          iconColor: mutedColor,
          fontFamily,
          fontSize: '16px',
          '::placeholder': {
            color: mutedColor,
          },
          ':-webkit-autofill': {
            color: baseColor,
          },
        },
        invalid: {
          color: '#d1242f',
          iconColor: '#d1242f',
        },
      },
    };
  }, [themeIsDark]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!stripe || !elements) {
        return;
      }

      const card = elements.getElement(CardElement);
      if (!card) {
        setErrorMessage('Payment form is not ready yet. Please try again.');
        return;
      }

      setIsSubmitting(true);
      setErrorMessage(null);

      if (intentType === 'setup') {
        const result = await stripe.confirmCardSetup(clientSecret, {
          payment_method: {
            card,
          },
        });

        if (result.error) {
          setErrorMessage(
            result.error.message || 'Payment failed. Please try again.',
          );
          setIsSubmitting(false);
          return;
        }

        if (result.setupIntent?.status === 'succeeded') {
          onPaymentSucceeded();
        }
      } else {
        const result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card,
          },
        });

        if (result.error) {
          setErrorMessage(
            result.error.message || 'Payment failed. Please try again.',
          );
          setIsSubmitting(false);
          return;
        }

        if (result.paymentIntent?.status === 'succeeded') {
          onPaymentSucceeded();
        }
      }

      setIsSubmitting(false);
    },
    [clientSecret, elements, onPaymentSucceeded, stripe],
  );

  return (
    <Box as="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 3 }}>
      <CardElement
        options={cardOptions as any}
        onReady={element => {
          try {
            element.focus();
          } catch {
            // no-op: focus may fail if the element is unmounted.
          }
        }}
      />
      {errorMessage && <Flash variant="danger">{errorMessage}</Flash>}
      <Button
        variant="primary"
        type="submit"
        disabled={!stripe || isSubmitting}
      >
        {isSubmitting ? 'Processing payment...' : 'Pay now'}
      </Button>
    </Box>
  );
}

/**
 * Stripe checkout.
 */
export function StripeCheckout({
  checkoutPortal,
  appearance,
  accountUid,
}: StripeCheckoutProps) {
  const {
    useCreateTopUpPaymentIntent,
    useCreateSubscriptionPaymentIntent,
    useCreateResumeSetupIntent,
    useSubscriptionPlans,
    useTopUpPrices,
    useSubscriptionStatus,
    useCancelSubscription,
    useResumeSubscription,
  } = useCache();
  const [stripe, setStripe] = useState<Promise<Stripe | null> | null>(null);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(
    null,
  );
  const [product, setProduct] = useState<IPrice | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] =
    useState<ISubscriptionPlan | null>(null);
  const [checkout, setCheckout] = useState<boolean>(false);
  const [checkoutType, setCheckoutType] = useState<
    'topup' | 'subscription' | 'resume'
  >('topup');
  const [cancelViewOpen, setCancelViewOpen] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  // Get Stripe prices using TanStack Query hook
  const { data: pricesData } = useTopUpPrices();
  const items = (pricesData as IPrice[] | undefined) ?? null;
  const sortedTopUpItems = useMemo(
    () =>
      [...(items ?? [])].sort(
        (left, right) => Number(left.amount || 0) - Number(right.amount || 0),
      ),
    [items],
  );
  const { data: plansData } = useSubscriptionPlans({ accountUid });
  const plans = useMemo(
    () => (plansData as ISubscriptionPlan[] | undefined) ?? [],
    [plansData],
  );

  const {
    data: subscriptionResp,
    refetch: refetchSubscriptionStatus,
    isFetching: isSubscriptionStatusRefreshing,
  } = useSubscriptionStatus({ accountUid });
  const cancelSubscriptionMutation = useCancelSubscription({ accountUid });
  const resumeSubscriptionMutation = useResumeSubscription({ accountUid });

  // Get checkout session mutation
  const topUpPaymentIntentMutation = useCreateTopUpPaymentIntent({
    accountUid,
  });
  const subscriptionPaymentIntentMutation = useCreateSubscriptionPaymentIntent({
    accountUid,
  });
  const resumeSetupIntentMutation = useCreateResumeSetupIntent({ accountUid });

  // Load stripe API
  useEffect(() => {
    if (checkoutPortal?.metadata?.stripe_key) {
      import('@stripe/stripe-js').then(module => {
        setStripe(module.loadStripe(checkoutPortal.metadata?.stripe_key ?? ''));
      });
    }
  }, [checkoutPortal?.metadata?.stripe_key]);

  const paymentOptions = useMemo<StripeElementsOptions | null>(() => {
    if (!paymentClientSecret) {
      return null;
    }

    return {
      clientSecret: paymentClientSecret,
      ...(appearance ? { appearance } : {}),
    };
  }, [appearance, paymentClientSecret]);

  const elementsAppearanceKey = useMemo(() => {
    if (!appearance) {
      return 'default';
    }
    try {
      return JSON.stringify(appearance);
    } catch {
      return String(appearance?.theme ?? 'default');
    }
  }, [appearance]);

  const onPaymentSucceeded = useCallback(async () => {
    setCheckout(false);
    setPaymentClientSecret(null);
    setProduct(null);
    setSubscriptionPlan(null);
    setPaymentMessage(null);
    if (checkoutType === 'resume') {
      try {
        const resp = await resumeSubscriptionMutation.mutateAsync();
        setPaymentMessage(
          resp?.message || 'Payment confirmed and plan resumed successfully.',
        );
      } catch (error) {
        setPaymentMessage(
          error instanceof Error
            ? error.message
            : 'Payment confirmed, but unable to resume your plan right now.',
        );
      }
      return;
    }
    if (checkoutType === 'subscription') {
      // Poll plan status briefly so the UI flips to paid state as soon
      // as Stripe + backend snapshot are ready.
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          await refetchSubscriptionStatus();
        } catch {
          // Keep the success message even if refresh fails transiently.
        }
        if (attempt < 4) {
          await new Promise(resolve => setTimeout(resolve, 1200));
        }
      }
      setPaymentMessage(
        'Plan payment confirmed. Your plan status may take a few seconds to refresh.',
      );
    } else {
      setPaymentMessage(
        'Payment confirmed. Credits update may take a few seconds.',
      );
    }
  }, [checkoutType, refetchSubscriptionStatus, resumeSubscriptionMutation]);

  const subscription = subscriptionResp?.subscription || null;
  const availablePlans = useMemo<ISubscriptionPlan[]>(() => {
    const byId = new Map<string, ISubscriptionPlan>();
    const add = (plan: any) => {
      const id = plan?.id;
      if (!id || typeof id !== 'string') {
        return;
      }
      byId.set(id, {
        id,
        name: String(plan?.name || id),
        amount: Number(plan?.amount || 0),
        currency: String(plan?.currency || 'usd'),
        interval: plan?.interval,
        included_runs:
          typeof plan?.included_runs === 'number'
            ? plan.included_runs
            : undefined,
        included_credits:
          typeof plan?.included_credits === 'number'
            ? plan.included_credits
            : undefined,
      });
    };
    plans.forEach(add);
    (subscriptionResp?.available_subscriptions || []).forEach(add);
    return Array.from(byId.values());
  }, [plans, subscriptionResp?.available_subscriptions]);

  const subscriptionStatus = subscription?.status || 'unknown';
  const normalizedSubscriptionStatus = String(subscriptionStatus).toLowerCase();
  const isPendingSubscriptionCheckout =
    normalizedSubscriptionStatus === 'incomplete';
  const rawCurrentSubscriptionPlan = isPendingSubscriptionCheckout
    ? 'Free'
    : subscription?.plan_name || 'Free';
  const currentSubscriptionPlan = useMemo(() => {
    const raw = String(rawCurrentSubscriptionPlan || 'Free');
    const byId = availablePlans.find(plan => plan.id === raw);
    const resolved = byId?.name || raw;
    // Always present plan names with a trailing " Plan" for consistency with
    // other surfaces (e.g. /settings/plans/overview).
    return /\bplan$/i.test(resolved) ? resolved : `${resolved} Plan`;
  }, [availablePlans, rawCurrentSubscriptionPlan]);
  const currentPlanDetails = useMemo(() => {
    const byPlanId = availablePlans.find(
      plan => plan.id && plan.id === subscription?.plan_id,
    );
    if (byPlanId) {
      return byPlanId;
    }

    const normalizedCurrentPlanName = String(
      currentSubscriptionPlan,
    ).toLowerCase();
    return (
      availablePlans.find(
        plan =>
          plan.name &&
          normalizedCurrentPlanName.includes(plan.name.toLowerCase()),
      ) || null
    );
  }, [availablePlans, currentSubscriptionPlan, subscription?.plan_id]);
  const currentPlanPriceLabel = useMemo(() => {
    if (!currentPlanDetails) {
      return 'N/A';
    }
    const amount = Number(currentPlanDetails.amount || 0);
    const currency = currentPlanDetails.currency || 'usd';
    const formatted = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
    }).format(amount / 100);
    return `${formatted}${currentPlanDetails.interval ? ` / ${currentPlanDetails.interval}` : ''}`;
  }, [currentPlanDetails]);
  const subscriptionPeriodEndLabel = useMemo(() => {
    const rawEnd = subscription?.current_period_end;
    if (!rawEnd) {
      return 'N/A';
    }
    const parsed = new Date(rawEnd);
    if (Number.isNaN(parsed.getTime())) {
      return String(rawEnd);
    }
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(parsed);
  }, [subscription?.current_period_end]);
  const subscriptionPortalUrl =
    subscriptionResp?.portal?.url || checkoutPortal?.url;
  const isStripeTestConfiguration = useMemo(() => {
    const stripeKey = String(checkoutPortal?.metadata?.stripe_key || '').trim();
    if (stripeKey.startsWith('pk_test_')) {
      return true;
    }
    const portalUrl = String(checkoutPortal?.url || '').toLowerCase();
    return portalUrl.includes('/test_');
  }, [checkoutPortal]);
  const isCancellationScheduled = Boolean(subscription?.cancel_at_period_end);
  const isIncompleteSubscription =
    normalizedSubscriptionStatus === 'incomplete';
  const displaySubscriptionStatus = isCancellationScheduled
    ? 'cancelled'
    : String(currentSubscriptionPlan).toLowerCase().includes('free') ||
        String(currentSubscriptionPlan).toLowerCase().includes('trial') ||
        String(currentSubscriptionPlan).toLowerCase() === 'unknown' ||
        String(currentSubscriptionPlan).toLowerCase() === 'none'
      ? null
      : normalizedSubscriptionStatus &&
          normalizedSubscriptionStatus !== 'unknown'
        ? String(subscriptionStatus).replaceAll('_', ' ')
        : null;
  const normalizedPlanName = String(currentSubscriptionPlan).toLowerCase();
  const planIncludedRuns = asPositiveNumber(
    plans.find(
      plan => plan.name && normalizedPlanName.includes(plan.name.toLowerCase()),
    )?.included_runs,
  );
  const defaultIncludedRuns =
    planIncludedRuns ||
    Object.entries(PLAN_INCLUDED_RUNS_DEFAULTS).find(([planKey]) =>
      normalizedPlanName.includes(planKey),
    )?.[1] ||
    null;
  const resolvedIncludedRuns =
    asPositiveNumber(subscription?.included_runs) || defaultIncludedRuns;
  const usedRuns =
    asNonNegativeNumber(subscription?.current_runs) ||
    asNonNegativeNumber(subscription?.used_runs) ||
    0;
  const walletIsQuota = Boolean(subscription?.wallet_is_quota);
  const walletBalanceRaw =
    asNonNegativeNumber(subscription?.wallet_balance) || 0;
  const walletQuota = asPositiveNumber(subscription?.wallet_quota);
  const usedCredits =
    asNonNegativeNumber(subscription?.current_credits) ||
    asNonNegativeNumber(subscription?.used_credits) ||
    0;
  const includedCredits = walletIsQuota
    ? (walletQuota ?? 0)
    : Math.max(0, usedCredits + walletBalanceRaw);
  const remainingCredits = walletIsQuota
    ? Math.max(0, includedCredits - usedCredits)
    : Math.max(0, walletBalanceRaw);
  const runsTotal = resolvedIncludedRuns ?? 0;
  const runsSegments = useMemo(
    () => buildUsageSegments(usedRuns, runsTotal),
    [usedRuns, runsTotal],
  );
  const periodStartDate = useMemo(() => {
    const rawStart = subscription?.current_period_start;
    if (!rawStart) {
      return null;
    }
    const parsed = new Date(rawStart);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [subscription?.current_period_start]);
  const periodEndDate = useMemo(() => {
    const rawEnd = subscription?.current_period_end;
    if (!rawEnd) {
      return null;
    }
    const parsed = new Date(rawEnd);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [subscription?.current_period_end]);
  const periodProgress = useMemo(() => {
    if (!periodStartDate || !periodEndDate) {
      return null;
    }
    const startMs = periodStartDate.getTime();
    const endMs = periodEndDate.getTime();
    if (endMs <= startMs) {
      return null;
    }

    const nowMs = Date.now();
    const totalMs = endMs - startMs;
    const elapsedMs = Math.min(Math.max(nowMs - startMs, 0), totalMs);
    const remainingMs = Math.max(endMs - nowMs, 0);
    const msPerDay = 24 * 60 * 60 * 1000;
    const totalDays = Math.max(1, Math.ceil(totalMs / msPerDay));
    const elapsedDays = Math.min(totalDays, Math.floor(elapsedMs / msPerDay));
    const remainingDays = Math.max(0, Math.ceil(remainingMs / msPerDay));

    return {
      elapsedPct: (elapsedMs / totalMs) * 100,
      remainingPct: (remainingMs / totalMs) * 100,
      totalDays,
      elapsedDays,
      remainingDays,
    };
  }, [periodEndDate, periodStartDate]);
  const walletBalance = walletIsQuota
    ? Math.max(0, remainingCredits)
    : Math.max(0, walletBalanceRaw);
  const isRunsOverQuota = runsTotal > 0 && usedRuns > runsTotal;

  const hasBillablePlan = useMemo(() => {
    const normalizedPlan = String(currentSubscriptionPlan).toLowerCase();
    const freeLike =
      normalizedPlan.includes('free') ||
      normalizedPlan.includes('trial') ||
      normalizedPlan === 'unknown' ||
      normalizedPlan === 'none';
    return !freeLike;
  }, [currentSubscriptionPlan]);

  const isPaidSubscription = useMemo(() => {
    const normalizedStatus = String(subscriptionStatus).toLowerCase();
    if (!hasBillablePlan) {
      return false;
    }
    if (
      normalizedStatus.includes('incomplete') ||
      normalizedStatus.includes('canceled') ||
      normalizedStatus.includes('cancelled') ||
      normalizedStatus.includes('free') ||
      normalizedStatus === 'unknown'
    ) {
      return false;
    }
    return ['active', 'trialing', 'past_due', 'paid'].includes(
      normalizedStatus,
    );
  }, [hasBillablePlan, subscriptionStatus]);

  const canCancelSubscription = useMemo(() => {
    if (!hasBillablePlan) {
      return false;
    }

    const status = String(subscriptionStatus).toLowerCase();
    const nonCancelable =
      isCancellationScheduled ||
      status.includes('incomplete_expired') ||
      status.includes('canceled') ||
      status.includes('cancelled') ||
      status.includes('free') ||
      status === 'unknown';

    return !nonCancelable;
  }, [hasBillablePlan, subscriptionStatus, isCancellationScheduled]);

  useEffect(() => {
    if (isPaidSubscription && paymentMessage) {
      setPaymentMessage(null);
    }
  }, [isPaidSubscription, paymentMessage]);

  useEffect(() => {
    if (!isPaidSubscription && !subscriptionPlan && plans.length > 0) {
      setSubscriptionPlan(plans[0]);
    }
  }, [isPaidSubscription, plans, subscriptionPlan]);

  // Auto-open the in-app cancel/downgrade view when the page is opened with
  // `?action=downgrade` (e.g. from the Plan Overview "Downgrade" CTA).
  // When opened with `?action=resume`, immediately trigger the resume flow.
  const autoActionTriggeredRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (autoActionTriggeredRef.current) {
      return;
    }
    try {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      if (action === 'downgrade' && isPaidSubscription) {
        autoActionTriggeredRef.current = true;
        setCancelViewOpen(true);
      } else if (action === 'resume' && isCancellationScheduled) {
        autoActionTriggeredRef.current = true;
        void onResumeSubscription();
      }
    } catch (_error) {
      // Ignore malformed URLs.
    }
  }, [isPaidSubscription, isCancellationScheduled]);

  const startCheckout = useCallback(async () => {
    if (!product) {
      return;
    }
    setPaymentMessage(null);
    setCheckoutType('topup');
    setCheckout(true);
    try {
      const clientSecret = await topUpPaymentIntentMutation.mutateAsync({
        product,
      });
      if (!clientSecret) {
        setPaymentClientSecret(null);
        setCheckout(false);
        setPaymentMessage(
          'Unable to initialize Stripe checkout. Please try again.',
        );
        return;
      }
      setPaymentClientSecret(clientSecret);
    } catch (error) {
      const detail =
        error instanceof Error
          ? error.message
          : 'Unable to initialize Stripe checkout. Please try again.';
      setPaymentClientSecret(null);
      setCheckout(false);
      setPaymentMessage(detail);
    }
  }, [topUpPaymentIntentMutation, product]);

  const startSubscriptionCheckout = useCallback(
    async (planOverride?: ISubscriptionPlan | null) => {
      const selectedPlan = planOverride ?? subscriptionPlan;
      if (!selectedPlan) {
        setPaymentMessage('Select a monthly plan first.');
        return;
      }
      setPaymentMessage(null);
      try {
        const clientSecret =
          await subscriptionPaymentIntentMutation.mutateAsync({
            plan: selectedPlan,
          });
        if (!clientSecret) {
          setPaymentClientSecret(null);
          setCheckout(false);
          setPaymentMessage(
            'Unable to initialize Stripe checkout. Please try again.',
          );
          return;
        }
        setSubscriptionPlan(selectedPlan);
        setPaymentClientSecret(clientSecret);
        setCheckoutType('subscription');
        setCheckout(true);
      } catch (error) {
        const detail =
          error instanceof Error
            ? error.message
            : 'Unable to initialize Stripe checkout. Please try again.';
        setPaymentClientSecret(null);
        setCheckout(false);
        setPaymentMessage(detail);
      }
    },
    [subscriptionPaymentIntentMutation, subscriptionPlan],
  );

  const pendingSubscriptionPlan = useMemo(() => {
    const teamLikePlan = plans.find(plan =>
      String(plan?.name || '')
        .toLowerCase()
        .includes('team'),
    );
    return teamLikePlan || plans[0] || null;
  }, [plans]);

  const startPendingSubscriptionCheckout = useCallback(() => {
    if (!pendingSubscriptionPlan) {
      setPaymentMessage('Select a monthly plan first.');
      return;
    }
    void startSubscriptionCheckout(pendingSubscriptionPlan);
  }, [pendingSubscriptionPlan, startSubscriptionCheckout]);

  const openPortal = useCallback((url?: string) => {
    if (!url) {
      return;
    }
    window.open(url, '_blank', 'noreferrer');
  }, []);

  const cancelStripeCheckout = useCallback(() => {
    setCheckout(false);
    setPaymentClientSecret(null);
    setPaymentMessage(null);
  }, []);

  const onCancelSubscription = useCallback(() => {
    setPaymentMessage(null);
    setCancelViewOpen(true);
  }, []);

  const onAbortCancelView = useCallback(() => {
    setCancelViewOpen(false);
  }, []);

  const onConfirmCancelSubscription = useCallback(async () => {
    setPaymentMessage(null);
    try {
      const resp = await cancelSubscriptionMutation.mutateAsync();
      if (resp?.success === false) {
        throw new Error(
          resp?.message || 'Unable to update your plan right now.',
        );
      }

      // Refresh plan status so stale "incomplete" snapshots disappear
      // as soon as cancellation is applied upstream.
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          await refetchSubscriptionStatus();
        } catch {
          // Ignore transient refetch errors and keep trying.
        }
        if (attempt < 4) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }

      const responseStatus = String(resp?.status || '').toLowerCase();
      const responseCancelAtPeriodEnd = Boolean(resp?.cancel_at_period_end);
      const isNowCanceled =
        responseStatus.includes('canceled') ||
        responseStatus.includes('cancelled');

      const datedMessage =
        responseCancelAtPeriodEnd && subscriptionPeriodEndLabel
          ? `Plan will switch to Free at the end of the current period on ${subscriptionPeriodEndLabel}.`
          : null;

      setPaymentMessage(
        (isNowCanceled ? 'Pending plan change canceled.' : datedMessage) ||
          resp?.message ||
          'Plan change requested successfully.',
      );
      setCancelViewOpen(false);
    } catch (error) {
      setPaymentMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update your plan right now.',
      );
    }
  }, [
    cancelSubscriptionMutation,
    refetchSubscriptionStatus,
    subscriptionPeriodEndLabel,
  ]);

  const onResumeSubscription = useCallback(async () => {
    setPaymentMessage(null);
    try {
      const clientSecret = await resumeSetupIntentMutation.mutateAsync();
      if (!clientSecret) {
        setCheckout(false);
        setPaymentClientSecret(null);
        setPaymentMessage(
          'Unable to initialize Stripe checkout. Please try again.',
        );
        return;
      }
      setCheckoutType('resume');
      setPaymentClientSecret(clientSecret);
      setCheckout(true);
      setPaymentMessage(null);
    } catch (error) {
      setPaymentMessage(
        error instanceof Error
          ? error.message
          : 'Unable to initialize resume checkout right now.',
      );
    }
  }, [resumeSetupIntentMutation]);

  const onRefreshSubscriptionStatus = useCallback(async () => {
    setPaymentMessage(null);
    try {
      await refetchSubscriptionStatus();
      setPaymentMessage('Plan status refreshed.');
    } catch (error) {
      setPaymentMessage(
        error instanceof Error
          ? error.message
          : 'Unable to refresh plan status right now.',
      );
    }
  }, [refetchSubscriptionStatus]);

  const selectedCheckoutLabel = useMemo(() => {
    if (checkoutType === 'subscription' && subscriptionPlan) {
      const amount = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: subscriptionPlan.currency,
      }).format((subscriptionPlan.amount || 0) / 100);
      return `${subscriptionPlan.name} (${amount}${subscriptionPlan.interval ? ` / ${subscriptionPlan.interval}` : ''})`;
    }

    if (checkoutType === 'topup' && product) {
      const amount = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: product.currency,
      }).format((product.amount || 0) / 100);
      return `${product.name} (${amount}, ${product.credits} credits)`;
    }

    if (checkoutType === 'resume') {
      return 'Plan resume (card update required)';
    }

    return null;
  }, [checkoutType, product, subscriptionPlan]);

  const sectionTitleSx = {
    fontSize: 2,
    fontWeight: 'bold',
    marginBottom: 'var(--stack-gap-normal)',
  } as const;

  const monthlySubscriptionSection = (
    <Box
      sx={{
        borderTop: 'none',
        paddingTop: 0,
      }}
    >
      <Text as="h3" sx={sectionTitleSx}>
        Choose a monthly plan
      </Text>
      {isIncompleteSubscription ? (
        <Text as="p" sx={{ color: 'fg.muted' }}>
          A pending plan change already exists. Complete payment or cancel it
          from the billing portal before creating a new one.
        </Text>
      ) : !isPaidSubscription ? (
        <>
          <Box
            role="radiogroup"
            sx={{
              display: 'grid',
              gap: 'var(--stack-gap-condensed)',
              maxHeight: '260px',
              overflowY: 'auto',
              marginBottom: 'var(--stack-gap-normal)',
            }}
          >
            {plans.map(plan => (
              <Box
                key={plan.id}
                role="radio"
                aria-labelledby={`subscription-plan-${plan.id}`}
                aria-checked={subscriptionPlan?.id === plan.id}
                onClick={() => setSubscriptionPlan(plan)}
                sx={{
                  borderStyle: 'solid',
                  borderRadius: 'var(--borderRadius-medium)',
                  borderWidth: 'var(--borderWidth-thick)',
                  borderColor:
                    subscriptionPlan?.id === plan.id
                      ? 'var(--borderColor-accent-emphasis)'
                      : 'var(--borderColor-default)',
                  padding: 'var(--stack-padding-condensed)',
                  cursor: 'pointer',
                }}
              >
                <FormControl sx={{ alignItems: 'center' }}>
                  <FormControl.Label
                    id={`subscription-plan-${plan.id}`}
                    sx={{ alignSelf: 'center' }}
                  >
                    {plan.name}
                  </FormControl.Label>
                  <Text as="p">
                    {new Intl.NumberFormat(undefined, {
                      style: 'currency',
                      currency: plan.currency,
                    }).format((plan.amount || 0) / 100)}
                    {plan.interval ? ` / ${plan.interval}` : ''}
                  </Text>
                  {typeof plan.included_runs === 'number' && (
                    <Text as="p">{plan.included_runs} included runs</Text>
                  )}
                  {typeof plan.included_credits === 'number' && (
                    <Text as="p">{plan.included_credits} included credits</Text>
                  )}
                </FormControl>
              </Box>
            ))}
            {plans.length === 0 && (
              <Text as="p" sx={{ color: 'fg.muted' }}>
                No monthly plans available right now.
              </Text>
            )}
          </Box>
          <Button
            variant="primary"
            onClick={() => void startSubscriptionCheckout()}
            disabled={
              !subscriptionPlan ||
              subscriptionPaymentIntentMutation.isPending ||
              checkout
            }
          >
            {subscriptionPaymentIntentMutation.isPending
              ? 'Preparing Team plan checkout...'
              : 'Update to Team Plan'}
          </Button>
        </>
      ) : (
        <Text as="p" sx={{ color: 'fg.muted' }}>
          {isCancellationScheduled
            ? `Your monthly plan will cancel on ${subscriptionPeriodEndLabel}.`
            : 'Your monthly plan is active. You can manage plan details from plan controls.'}
        </Text>
      )}
    </Box>
  );

  const topUpSection = (
    <Box>
      <Text as="h3" sx={sectionTitleSx}>
        Topup your wallet with credits
      </Text>
      <Box
        role="radiogroup"
        sx={{
          display: 'grid',
          gap: 'var(--stack-gap-normal)',
          gridTemplateColumns: Array(sortedTopUpItems.length)
            .fill('1fr')
            .join(' '),
          padding: 0,
          marginBottom: 'var(--stack-gap-normal)',
        }}
      >
        {sortedTopUpItems.map(item => (
          <Box
            key={item.id}
            role="radio"
            aria-labelledby={`checkout-price-${item.id}`}
            aria-checked={product?.id === item.id}
            onClick={() => {
              setProduct(item);
            }}
            sx={{
              borderStyle: 'solid',
              borderRadius: 'var(--borderRadius-medium)',
              borderWidth: 'var(--borderWidth-thick)',
              borderColor:
                product?.id === item.id
                  ? 'var(--borderColor-accent-emphasis)'
                  : 'var(--borderColor-default)',
              padding: 'var(--stack-padding-condensed)',
              cursor: 'pointer',
            }}
          >
            <FormControl
              sx={{
                alignItems: 'center',
              }}
            >
              <FormControl.Label
                id={`checkout-price-${item.id}`}
                sx={{ alignSelf: 'center' }}
              >
                {item.name}
              </FormControl.Label>
              <Text as="p">
                {new Intl.NumberFormat(undefined, {
                  style: 'currency',
                  currency: item.currency,
                }).format(item.amount / 100)}
              </Text>
              <Text as="p">{item.credits} credits</Text>
            </FormControl>
          </Box>
        ))}
      </Box>
      <Button
        variant="primary"
        onClick={() => {
          void startCheckout();
        }}
        disabled={
          product === null || topUpPaymentIntentMutation.isPending || checkout
        }
        sx={{ float: 'right' }}
      >
        {topUpPaymentIntentMutation.isPending
          ? 'Preparing top-up checkout...'
          : 'Checkout'}
      </Button>
    </Box>
  );

  const topCards = (
    <Box
      sx={{
        marginBottom: 'var(--stack-gap-normal)',
        border: '1px solid',
        borderColor: 'border.default',
        borderRadius: 'var(--borderRadius-medium)',
        backgroundColor: 'canvas.default',
        padding: 'var(--stack-padding-normal)',
        display: 'grid',
        gap: 'var(--stack-gap-normal)',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gap: 'var(--stack-gap-normal)',
          gridTemplateColumns: ['1fr'],
          alignItems: 'start',
        }}
      >
        <Box>
          <Text
            as="h3"
            sx={{
              fontWeight: 'bold',
              marginBottom: 'var(--stack-gap-condensed)',
            }}
          >
            Plan status
          </Text>
          <Text as="p">Plan: {String(currentSubscriptionPlan)}</Text>
          {isPendingSubscriptionCheckout && (
            <Flash
              variant="warning"
              sx={{ marginTop: 'var(--stack-gap-condensed)' }}
            >
              Upgrade pending payment. Your Team plan is not active until card
              payment succeeds.
            </Flash>
          )}
          {currentPlanPriceLabel !== 'N/A' && (
            <Text as="p">Price: {currentPlanPriceLabel}</Text>
          )}
          {displaySubscriptionStatus && (
            <Text as="p" sx={{ marginBottom: 'var(--stack-gap-condensed)' }}>
              Status: {displaySubscriptionStatus}
            </Text>
          )}
          <Box
            sx={{
              marginBottom: 'var(--stack-gap-normal)',
              border: '1px solid',
              borderColor: 'border.muted',
              borderRadius: 'var(--borderRadius-medium)',
              backgroundColor: 'canvas.subtle',
              padding: 'var(--stack-padding-condensed)',
              display: 'grid',
              gap: 'var(--stack-gap-condensed)',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Text as="h4" sx={{ fontWeight: 'bold' }}>
                Current usage
              </Text>
              <Label size="small">{String(currentSubscriptionPlan)}</Label>
            </Box>

            <Box>
              <Text
                as="p"
                sx={{
                  marginBottom: 'var(--stack-gap-condensed)',
                  color: isRunsOverQuota ? 'danger.fg' : 'fg.default',
                  fontWeight: isRunsOverQuota ? 'bold' : 'normal',
                }}
              >
                Runs: {usedRuns.toLocaleString()} / {runsTotal.toLocaleString()}
              </Text>
              <ProgressBar
                barSize="small"
                aria-label="Runs usage"
                aria-valuenow={runsSegments.inQuotaPct + runsSegments.overPct}
              >
                <ProgressBar.Item
                  progress={runsSegments.inQuotaPct}
                  style={{ backgroundColor: 'var(--bgColor-success-emphasis)' }}
                  aria-label={`Used in quota: ${runsSegments.inQuotaPct.toFixed(1)}%`}
                />
                <ProgressBar.Item
                  progress={runsSegments.remainingPct}
                  style={{ backgroundColor: 'var(--bgColor-accent-emphasis)' }}
                  aria-label={`Remaining: ${runsSegments.remainingPct.toFixed(1)}%`}
                />
                <ProgressBar.Item
                  progress={runsSegments.overPct}
                  style={{ backgroundColor: 'var(--bgColor-danger-emphasis)' }}
                  aria-label={`Over quota: ${runsSegments.overPct.toFixed(1)}%`}
                />
              </ProgressBar>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  mt: 1,
                  flexWrap: 'wrap',
                }}
              >
                <Box
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}
                >
                  <DotFillIcon fill="var(--bgColor-success-emphasis)" />
                  <Text sx={{ fontSize: 0 }}>Used in quota</Text>
                </Box>
                <Box
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}
                >
                  <DotFillIcon fill="var(--bgColor-accent-emphasis)" />
                  <Text sx={{ fontSize: 0 }}>Remaining</Text>
                </Box>
                <Box
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}
                >
                  <DotFillIcon fill="var(--bgColor-danger-emphasis)" />
                  <Text sx={{ fontSize: 0 }}>Over quota</Text>
                </Box>
              </Box>
            </Box>

            {periodProgress ? (
              <Box>
                <Text
                  as="p"
                  sx={{ marginBottom: 'var(--stack-gap-condensed)' }}
                >
                  Usage period days: {periodProgress.elapsedDays} /{' '}
                  {periodProgress.totalDays}
                </Text>
                <ProgressBar
                  barSize="small"
                  aria-label="Usage period progress"
                  aria-valuenow={periodProgress.elapsedPct}
                >
                  <ProgressBar.Item
                    progress={periodProgress.elapsedPct}
                    style={{
                      backgroundColor: 'var(--bgColor-success-emphasis)',
                    }}
                    aria-label={`Elapsed: ${periodProgress.elapsedPct.toFixed(1)}%`}
                  />
                  <ProgressBar.Item
                    progress={periodProgress.remainingPct}
                    style={{
                      backgroundColor: 'var(--bgColor-accent-emphasis)',
                    }}
                    aria-label={`Remaining: ${periodProgress.remainingPct.toFixed(1)}%`}
                  />
                </ProgressBar>
                <Text
                  as="p"
                  sx={{
                    color: 'fg.muted',
                    fontSize: 0,
                    marginTop: 'var(--stack-gap-condensed)',
                  }}
                >
                  {periodProgress.remainingDays} day(s) remaining in current
                  period
                </Text>
              </Box>
            ) : null}

            <Box>
              <Text as="p" sx={{ marginBottom: 'var(--stack-gap-condensed)' }}>
                Wallet balance: {walletBalance.toLocaleString()}
              </Text>
              <Text as="p" sx={{ color: 'fg.muted' }}>
                Spent in current period: {usedCredits.toLocaleString()}
              </Text>
              <Text as="p" sx={{ color: 'fg.muted' }}>
                Wallet credits are additive on renewal and top-ups.
              </Text>
            </Box>
          </Box>
          {isCancellationScheduled && (
            <Flash
              variant="warning"
              sx={{ marginBottom: 'var(--stack-gap-condensed)' }}
            >
              Plan will switch to Free at the end of the current period on{' '}
              {subscriptionPeriodEndLabel}.
            </Flash>
          )}
          <Box
            sx={{
              display: 'flex',
              gap: 'var(--stack-gap-condensed)',
              flexWrap: 'wrap',
            }}
          >
            {subscriptionPortalUrl && (
              <Button
                variant="default"
                onClick={() => openPortal(subscriptionPortalUrl)}
              >
                Open Stripe billing portal
              </Button>
            )}
            <Button
              variant="default"
              onClick={() => void onRefreshSubscriptionStatus()}
              disabled={isSubscriptionStatusRefreshing}
            >
              {isSubscriptionStatusRefreshing
                ? 'Refreshing status...'
                : 'Refresh status'}
            </Button>
            {canCancelSubscription && !cancelViewOpen && (
              <Button variant="danger" onClick={onCancelSubscription}>
                Downgrade to Free Plan
              </Button>
            )}
            {isIncompleteSubscription && !cancelViewOpen && (
              <>
                <Button
                  variant="primary"
                  onClick={startPendingSubscriptionCheckout}
                  disabled={
                    subscriptionPaymentIntentMutation.isPending ||
                    checkout ||
                    !pendingSubscriptionPlan
                  }
                >
                  {subscriptionPaymentIntentMutation.isPending
                    ? 'Preparing checkout...'
                    : 'Continue pending payment'}
                </Button>
                <Button variant="danger" onClick={onCancelSubscription}>
                  Cancel pending plan change
                </Button>
              </>
            )}
            {isCancellationScheduled && (
              <Button
                variant="primary"
                onClick={() => void onResumeSubscription()}
                disabled={resumeSubscriptionMutation.isPending}
              >
                {resumeSubscriptionMutation.isPending
                  ? 'Resuming...'
                  : 'Resume plan'}
              </Button>
            )}
          </Box>
          <Text
            as="p"
            sx={{ color: 'fg.muted', marginTop: 'var(--stack-gap-normal)' }}
          >
            Next step:{' '}
            {isCancellationScheduled
              ? 'Your plan is already scheduled to switch at period end. You can keep using it until then.'
              : isIncompleteSubscription
                ? 'Your payment is pending. Open the in-app cancel view below to cancel this plan change or continue with payment.'
                : isPaidSubscription
                  ? 'Keep your plan active. You can top-up credits any time.'
                  : 'Top-up credits are available on Free and Team plans.'}
          </Text>
          {cancelViewOpen && (
            <Box
              sx={{
                marginTop: 'var(--stack-gap-normal)',
                border: '1px solid',
                borderColor: 'border.default',
                borderRadius: 'var(--borderRadius-medium)',
                backgroundColor: 'canvas.subtle',
                padding: 'var(--stack-padding-normal)',
                display: 'grid',
                gap: 'var(--stack-gap-condensed)',
              }}
            >
              <Text as="h4" sx={{ fontWeight: 'bold' }}>
                {isIncompleteSubscription
                  ? 'Cancel pending plan change'
                  : 'Downgrade to Free Plan'}
              </Text>
              <Text as="p" sx={{ color: 'fg.muted' }}>
                {isIncompleteSubscription
                  ? 'This pending plan change will be canceled immediately.'
                  : 'Your plan will switch at the end of the current usage period.'}
              </Text>
              <Box
                sx={{
                  display: 'flex',
                  gap: 'var(--stack-gap-condensed)',
                  flexWrap: 'wrap',
                }}
              >
                <Button
                  variant="danger"
                  onClick={() => void onConfirmCancelSubscription()}
                  disabled={cancelSubscriptionMutation.isPending}
                >
                  {cancelSubscriptionMutation.isPending
                    ? isIncompleteSubscription
                      ? 'Canceling pending plan change...'
                      : 'Downgrading...'
                    : isIncompleteSubscription
                      ? 'Confirm cancel pending plan change'
                      : 'Confirm downgrade'}
                </Button>
                <Button
                  variant="default"
                  onClick={onAbortCancelView}
                  disabled={cancelSubscriptionMutation.isPending}
                >
                  {isIncompleteSubscription
                    ? 'Keep pending plan change'
                    : 'Keep current plan'}
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );

  let view = (
    <Box sx={{ minHeight: '40px' }}>
      <Spinner />
    </Box>
  );
  // While the Stripe payment form is shown, disable interaction with the
  // status / plan picker cards behind it so the only available action is the
  // "Cancel" button next to the form.
  const disabledTopCards = (
    <Box
      aria-disabled="true"
      sx={{
        pointerEvents: 'none',
        opacity: 0.5,
        userSelect: 'none',
      }}
    >
      {topCards}
    </Box>
  );
  if (checkout) {
    if (stripe && paymentOptions && paymentClientSecret) {
      view = createElement(
        Box,
        { id: 'checkout', sx: { flex: '1 1 auto', display: 'grid', gap: 3 } },
        createElement(
          Box,
          {
            sx: {
              border: '1px solid',
              borderColor: 'border.default',
              borderRadius: 'var(--borderRadius-medium)',
              backgroundColor: 'canvas.default',
              padding: 'var(--stack-padding-normal)',
              display: 'flex',
              gap: 'var(--stack-gap-normal)',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
            },
          },
          createElement(
            Box,
            {
              sx: {
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2,
              },
            },
            createElement(Text, { as: 'p' }, 'Selected for checkout:'),
            selectedCheckoutLabel
              ? createElement(
                  Label,
                  {
                    variant: checkoutType === 'topup' ? 'success' : 'accent',
                  },
                  selectedCheckoutLabel,
                )
              : null,
          ),
          createElement(
            Button,
            { variant: 'default', onClick: cancelStripeCheckout },
            'Cancel',
          ),
        ),
        checkoutType === 'resume'
          ? createElement(
              Flash,
              { variant: 'warning' },
              'Enter a new payment card to resume your plan.',
            )
          : null,
        createElement(
          Elements,
          {
            key: `${checkoutType}-${paymentClientSecret ?? 'none'}-${elementsAppearanceKey}`,
            stripe,
            options: paymentOptions,
          },
          createElement(
            Box,
            {
              sx: {
                border: '1px solid',
                borderColor: 'border.default',
                borderRadius: 'var(--borderRadius-medium)',
                backgroundColor: 'canvas.default',
                padding: 'var(--stack-padding-normal)',
                width: '100%',
                maxWidth: '720px',
                margin: '0 auto',
              },
            },
            createElement(StripePaymentForm, {
              clientSecret: paymentClientSecret!,
              intentType: checkoutType === 'resume' ? 'setup' : 'payment',
              onPaymentSucceeded,
            }),
          ),
        ),
        disabledTopCards,
      );
    } else {
      view = (
        <Box sx={{ flex: '1 1 auto', display: 'grid', gap: 3 }}>
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'border.default',
              borderRadius: 'var(--borderRadius-medium)',
              backgroundColor: 'canvas.default',
              padding: 'var(--stack-padding-normal)',
              display: 'flex',
              gap: 'var(--stack-gap-normal)',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
            }}
          >
            <Text as="p">Preparing Stripe checkout…</Text>
            <Button variant="default" onClick={cancelStripeCheckout}>
              Cancel
            </Button>
          </Box>
          {disabledTopCards}
        </Box>
      );
    }
  } else if (items) {
    view = items.length ? (
      <Box
        sx={{ flex: '1 1 auto' }}
        onKeyDown={event => {
          if (product && event.key === 'Enter') {
            void startCheckout();
          }
        }}
      >
        <Box
          sx={{
            marginTop: 'var(--stack-gap-normal)',
            border: '1px solid',
            borderColor: 'border.default',
            borderRadius: 'var(--borderRadius-medium)',
            backgroundColor: 'canvas.default',
            padding: 'var(--stack-padding-normal)',
            display: 'grid',
            gap: 'var(--stack-gap-normal)',
            gridTemplateColumns: ['1fr', 'minmax(0, 1fr) minmax(0, 1fr)'],
            alignItems: 'start',
          }}
        >
          <Box
            sx={{
              borderRight: ['none', '1px solid'],
              borderColor: 'border.muted',
              paddingRight: ['0', 'var(--stack-gap-normal)'],
            }}
          >
            {monthlySubscriptionSection}
          </Box>
          <Box
            sx={{
              paddingLeft: ['0', 'var(--stack-gap-normal)'],
            }}
          >
            {topUpSection}
          </Box>
          {isStripeTestConfiguration ? (
            <Box
              sx={{
                gridColumn: ['1', '1 / -1'],
                borderTop: '1px solid',
                borderColor: 'border.muted',
                paddingTop: 'var(--stack-gap-normal)',
              }}
            >
              <Label variant="attention">Stripe test configuration</Label>
            </Box>
          ) : null}
        </Box>
        {paymentMessage && (
          <Flash variant="success" sx={{ mt: 3 }}>
            {paymentMessage}
          </Flash>
        )}
        {topCards}
      </Box>
    ) : (
      <Box>
        {topCards}
        <Flash variant="danger">
          Unable to fetch the available products. Please try again later.
        </Flash>
      </Box>
    );
  }

  return view;
}
