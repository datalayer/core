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
  Spinner,
  Text,
  useTheme,
} from '@primer/react';
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
}

export type StripeCheckoutProps = {
  checkoutPortal: ICheckoutPortal | null;
  appearance?: StripeElementsOptions['appearance'];
};

const PLAN_INCLUDED_RUNS_DEFAULTS: Record<string, number> = {
  starter: 1000,
  free: 1000,
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
  const { data: plansData } = useSubscriptionPlans();
  const plans = useMemo(
    () => (plansData as ISubscriptionPlan[] | undefined) ?? [],
    [plansData],
  );

  const { data: subscriptionResp, refetch: refetchSubscriptionStatus } =
    useSubscriptionStatus();
  const cancelSubscriptionMutation = useCancelSubscription();
  const resumeSubscriptionMutation = useResumeSubscription();

  // Get checkout session mutation
  const topUpPaymentIntentMutation = useCreateTopUpPaymentIntent();
  const subscriptionPaymentIntentMutation =
    useCreateSubscriptionPaymentIntent();
  const resumeSetupIntentMutation = useCreateResumeSetupIntent();

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
          resp?.message ||
            'Payment confirmed and subscription resumed successfully.',
        );
      } catch (error) {
        setPaymentMessage(
          error instanceof Error
            ? error.message
            : 'Payment confirmed, but unable to resume subscription right now.',
        );
      }
      return;
    }
    if (checkoutType === 'subscription') {
      // Poll subscription status briefly so the UI flips to paid state as soon
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
        'Subscription payment confirmed. Your plan status may take a few seconds to refresh.',
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
      });
    };
    plans.forEach(add);
    (subscriptionResp?.available_subscriptions || []).forEach(add);
    return Array.from(byId.values());
  }, [plans, subscriptionResp?.available_subscriptions]);

  const rawCurrentSubscriptionPlan =
    subscription?.plan_name ||
    subscription?.plan?.name ||
    subscription?.plan ||
    'Free';
  const currentSubscriptionPlan = useMemo(() => {
    const raw = String(rawCurrentSubscriptionPlan || 'Free');
    const byId = availablePlans.find(plan => plan.id === raw);
    const resolved = byId?.name || raw;
    // Always present plan names with a trailing " Plan" for consistency with
    // other surfaces (e.g. /settings/subscription/overview).
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
  const subscriptionPeriodStartLabel = useMemo(() => {
    const rawStart =
      subscription?.current_period_start ||
      subscription?.subscription_period_start_ts_dt;
    if (!rawStart) {
      return 'N/A';
    }
    const parsed = new Date(rawStart);
    if (Number.isNaN(parsed.getTime())) {
      return String(rawStart);
    }
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(parsed);
  }, [
    subscription?.current_period_start,
    subscription?.subscription_period_start_ts_dt,
  ]);
  const subscriptionPeriodEndLabel = useMemo(() => {
    const rawEnd =
      subscription?.current_period_end ||
      subscription?.subscription_period_end_ts_dt;
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
  }, [
    subscription?.current_period_end,
    subscription?.subscription_period_end_ts_dt,
  ]);
  const subscriptionPortalUrl =
    subscriptionResp?.portal?.url || checkoutPortal?.url;
  const subscriptionStatus =
    subscription?.status || subscription?.subscription_status || 'unknown';
  const normalizedSubscriptionStatus = String(subscriptionStatus).toLowerCase();
  const isCancellationScheduled =
    Boolean(subscription?.cancel_at_period_end) ||
    Boolean(subscription?.subscription_cancel_at_period_end_b);
  const isIncompleteSubscription =
    normalizedSubscriptionStatus === 'incomplete';
  const displaySubscriptionStatus = isCancellationScheduled
    ? 'cancelled'
    : normalizedSubscriptionStatus && normalizedSubscriptionStatus !== 'unknown'
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
    asPositiveNumber(subscription?.included_runs) ||
    asPositiveNumber(subscription?.plan?.included_runs) ||
    asPositiveNumber(subscription?.metadata?.included_runs) ||
    defaultIncludedRuns;
  const usedRuns =
    asNonNegativeNumber(subscription?.used_runs) ||
    asNonNegativeNumber(subscription?.usage?.used_runs) ||
    asNonNegativeNumber(subscription?.metadata?.used_runs) ||
    0;
  const remainingRuns =
    resolvedIncludedRuns === null
      ? null
      : Math.max(0, (resolvedIncludedRuns ?? 0) - usedRuns);

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

  const hasTopUpAccess = useMemo(() => {
    const normalizedPlan = String(currentSubscriptionPlan).toLowerCase();
    const normalizedStatus = String(subscriptionStatus).toLowerCase();
    const freeLike =
      normalizedPlan.includes('free') ||
      normalizedPlan.includes('trial') ||
      normalizedStatus.includes('free') ||
      normalizedStatus.includes('canceled') ||
      normalizedStatus.includes('cancelled');
    if (freeLike) {
      return false;
    }
    return ['active', 'trialing', 'paid', 'past_due'].includes(
      normalizedStatus,
    );
  }, [currentSubscriptionPlan, subscriptionStatus]);

  // Temporary business override: allow top-up even when monthly subscription
  // is not active, while still encouraging an upgrade path.
  const isTemporaryFreeTopUpAllowed = true;
  const canBuyTopUp =
    hasTopUpAccess || (!isPaidSubscription && isTemporaryFreeTopUpAllowed);

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
  // `?action=downgrade` (e.g. from the Subscription Overview "Downgrade" CTA).
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
    if (!product || !canBuyTopUp) {
      if (!canBuyTopUp) {
        setPaymentMessage(
          'Monthly subscription required before buying top-up credits.',
        );
      }
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
  }, [topUpPaymentIntentMutation, canBuyTopUp, product]);

  const startSubscriptionCheckout = useCallback(async () => {
    if (!subscriptionPlan) {
      setPaymentMessage('Select a monthly subscription plan first.');
      return;
    }
    setPaymentMessage(null);
    try {
      const clientSecret = await subscriptionPaymentIntentMutation.mutateAsync({
        plan: subscriptionPlan,
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
  }, [subscriptionPaymentIntentMutation, subscriptionPlan]);

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
      const datedMessage = subscriptionPeriodEndLabel
        ? `Subscription will cancel at the end of the current period on ${subscriptionPeriodEndLabel}.`
        : null;
      setPaymentMessage(
        datedMessage ||
          resp?.message ||
          'Subscription cancellation requested successfully.',
      );
      setCancelViewOpen(false);
    } catch (error) {
      setPaymentMessage(
        error instanceof Error
          ? error.message
          : 'Unable to cancel subscription right now.',
      );
    }
  }, [cancelSubscriptionMutation, subscriptionPeriodEndLabel]);

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
      return 'Subscription resume (card update required)';
    }

    return null;
  }, [checkoutType, product, subscriptionPlan]);

  const monthlySubscriptionSection = (
    <Box
      sx={{
        borderTop: 'none',
        paddingTop: 0,
      }}
    >
      <Text
        as="h3"
        sx={{
          fontWeight: 'bold',
          marginBottom: 'var(--stack-gap-condensed)',
        }}
      >
        Choose a monthly subscription
      </Text>
      {isIncompleteSubscription ? (
        <Text as="p" sx={{ color: 'fg.muted' }}>
          A pending subscription already exists. Complete payment or cancel it
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
                </FormControl>
              </Box>
            ))}
            {plans.length === 0 && (
              <Text as="p" sx={{ color: 'fg.muted' }}>
                No monthly subscription plans available right now.
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
            ? `Your monthly subscription will cancel on ${subscriptionPeriodEndLabel}.`
            : 'Your monthly subscription is active. You can manage plan details from subscription controls.'}
        </Text>
      )}
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
          gridTemplateColumns: ['1fr', 'minmax(0, 1fr) minmax(0, 1fr)'],
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
            Subscription status
          </Text>
          <Text as="p">Plan: {String(currentSubscriptionPlan)}</Text>
          {currentPlanPriceLabel !== 'N/A' && (
            <Text as="p">Price: {currentPlanPriceLabel}</Text>
          )}
          {displaySubscriptionStatus && (
            <Text as="p" sx={{ marginBottom: 'var(--stack-gap-condensed)' }}>
              Status: {displaySubscriptionStatus}
            </Text>
          )}
          {subscriptionPeriodStartLabel !== 'N/A' && (
            <Text as="p">Period start: {subscriptionPeriodStartLabel}</Text>
          )}
          {subscriptionPeriodEndLabel !== 'N/A' && (
            <Text as="p" sx={{ marginBottom: 'var(--stack-gap-condensed)' }}>
              Period end: {subscriptionPeriodEndLabel}
            </Text>
          )}
          {isCancellationScheduled && (
            <Flash
              variant="warning"
              sx={{ marginBottom: 'var(--stack-gap-condensed)' }}
            >
              Subscription will cancel at the end of the current period on{' '}
              {subscriptionPeriodEndLabel}.
            </Flash>
          )}
          {remainingRuns !== null && (
            <Text as="p" sx={{ marginBottom: 'var(--stack-gap-normal)' }}>
              {`Included runs remaining this period: ${remainingRuns.toLocaleString()}`}
            </Text>
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
            {canCancelSubscription && !cancelViewOpen && (
              <Button variant="danger" onClick={onCancelSubscription}>
                Downgrade to Free Plan
              </Button>
            )}
            {isCancellationScheduled && (
              <Button
                variant="primary"
                onClick={() => void onResumeSubscription()}
                disabled={resumeSubscriptionMutation.isPending}
              >
                {resumeSubscriptionMutation.isPending
                  ? 'Resuming...'
                  : 'Resume subscription'}
              </Button>
            )}
          </Box>
          <Text
            as="p"
            sx={{ color: 'fg.muted', marginTop: 'var(--stack-gap-normal)' }}
          >
            Next step:{' '}
            {isCancellationScheduled
              ? 'Your subscription is already scheduled for cancellation at period end. You can keep using it until then.'
              : isIncompleteSubscription
                ? 'Your payment is pending. Open the in-app cancel view below to cancel this subscription or continue with payment.'
                : isPaidSubscription
                  ? 'Keep your subscription active. Top-up credits are available for active monthly subscribers.'
                  : 'Choose a monthly subscription, then buy top-up credits as needed.'}
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
                Downgrade to Free Plan
              </Text>
              <Text as="p" sx={{ color: 'fg.muted' }}>
                {isIncompleteSubscription
                  ? 'This pending subscription will be canceled immediately.'
                  : 'Your subscription will be canceled at the end of the current billing period.'}
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
                    ? 'Downgrading...'
                    : 'Confirm downgrade'}
                </Button>
                <Button
                  variant="default"
                  onClick={onAbortCancelView}
                  disabled={cancelSubscriptionMutation.isPending}
                >
                  Keep current plan
                </Button>
              </Box>
            </Box>
          )}
        </Box>
        <Box
          sx={{
            borderLeft: ['none', '1px solid'],
            borderColor: 'border.muted',
            paddingLeft: ['0', 'var(--stack-gap-normal)'],
          }}
        >
          {monthlySubscriptionSection}
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
        disabledTopCards,
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
            Text,
            { as: 'p' },
            selectedCheckoutLabel
              ? `Selected for checkout: ${selectedCheckoutLabel}`
              : 'Selected for checkout',
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
              'Enter a new payment card to resume your subscription.',
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
      );
    } else {
      view = (
        <Box sx={{ flex: '1 1 auto', display: 'grid', gap: 3 }}>
          {disabledTopCards}
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
        {topCards}
        {paymentMessage && (
          <Flash variant={canBuyTopUp ? 'success' : 'warning'} sx={{ mt: 3 }}>
            {paymentMessage}
          </Flash>
        )}
        {!canBuyTopUp && (
          <Flash variant="warning" sx={{ mt: 3, mb: 3 }}>
            Monthly subscription required. Activate a monthly plan first, then
            top-up credits will be available.
          </Flash>
        )}
        <Text
          as="h3"
          sx={{
            marginTop: 'var(--stack-gap-spacious)',
            marginBottom: 'var(--stack-gap-normal)',
            fontSize: 4,
            fontWeight: 'bold',
          }}
        >
          Topup with credits package
        </Text>
        {!hasTopUpAccess && canBuyTopUp && (
          <Flash variant="warning" sx={{ mt: 2, mb: 3 }}>
            Monthly subscription is normally required. Temporary allowance is
            enabled: you can buy top-up credits now. Update to Team Plan for
            included monthly runs.
          </Flash>
        )}
        <Box
          role="radiogroup"
          sx={{
            display: 'grid',
            gap: 'var(--stack-gap-normal)',
            gridTemplateColumns: Array(sortedTopUpItems.length)
              .fill('1fr')
              .join(' '),
            padding: 'var(--stack-padding-normal) 0',
          }}
        >
          {sortedTopUpItems.map(item => (
            <Box
              key={item.id}
              role="radio"
              aria-labelledby={`checkout-price-${item.id}`}
              aria-checked={product?.id === item.id}
              onClick={() => {
                if (canBuyTopUp) {
                  setProduct(item);
                }
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
                cursor: canBuyTopUp ? 'pointer' : 'not-allowed',
                opacity: canBuyTopUp ? 1 : 0.6,
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
            product === null ||
            !canBuyTopUp ||
            topUpPaymentIntentMutation.isPending ||
            checkout
          }
          sx={{ float: 'right' }}
        >
          {topUpPaymentIntentMutation.isPending
            ? 'Preparing top-up checkout...'
            : 'Checkout'}
        </Button>
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
