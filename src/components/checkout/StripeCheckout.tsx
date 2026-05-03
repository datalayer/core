/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { Button, Flash, FormControl, Spinner, Text } from '@primer/react';
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

export type StripeCheckoutProps = {
  checkoutPortal: ICheckoutPortal | null;
  appearance?: StripeElementsOptions['appearance'];
};

type StripePaymentFormProps = {
  onPaymentSucceeded: () => void;
};

function StripePaymentForm({ onPaymentSucceeded }: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!stripe || !elements) {
        return;
      }

      setIsSubmitting(true);
      setErrorMessage(null);

      const result = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
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

      setIsSubmitting(false);
    },
    [elements, onPaymentSucceeded, stripe],
  );

  return (
    <Box as="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 3 }}>
      <PaymentElement />
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
    useTopUpPrices,
    useSubscriptionStatus,
    useCancelSubscription,
  } = useCache();
  const [stripe, setStripe] = useState<Promise<Stripe | null> | null>(null);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(
    null,
  );
  const [product, setProduct] = useState<IPrice | null>(null);
  const [checkout, setCheckout] = useState<boolean>(false);
  const [cancelInProgress, setCancelInProgress] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  // Get Stripe prices using TanStack Query hook
  const { data: pricesData } = useTopUpPrices();
  const items = (pricesData as IPrice[] | undefined) ?? null;

  const { data: subscriptionResp } = useSubscriptionStatus();
  const cancelSubscriptionMutation = useCancelSubscription();

  // Get checkout session mutation
  const topUpPaymentIntentMutation = useCreateTopUpPaymentIntent();

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

  const onPaymentSucceeded = useCallback(() => {
    setCheckout(false);
    setPaymentClientSecret(null);
    setProduct(null);
    setPaymentMessage(
      'Payment confirmed. Credits update may take a few seconds.',
    );
  }, []);

  const subscription = subscriptionResp?.subscription || null;
  const subscriptionPortalUrl =
    subscriptionResp?.portal?.url || checkoutPortal?.url;
  const subscriptionPlan =
    subscription?.plan_name ||
    subscription?.plan?.name ||
    subscription?.plan ||
    'Free';
  const subscriptionStatus =
    subscription?.status || subscription?.subscription_status || 'unknown';
  const includedRuns = Number(subscription?.included_runs);
  const usedRuns = Number(subscription?.used_runs);
  const remainingRuns =
    Number.isFinite(includedRuns) && Number.isFinite(usedRuns)
      ? Math.max(0, includedRuns - usedRuns)
      : null;

  const isPaidSubscription = useMemo(() => {
    const normalizedPlan = String(subscriptionPlan).toLowerCase();
    const normalizedStatus = String(subscriptionStatus).toLowerCase();
    const freeLike =
      normalizedPlan.includes('free') ||
      normalizedPlan.includes('trial') ||
      normalizedStatus.includes('free') ||
      normalizedStatus.includes('canceled') ||
      normalizedStatus.includes('cancelled');
    return !freeLike;
  }, [subscriptionPlan, subscriptionStatus]);

  const hasTopUpAccess = useMemo(() => {
    const normalizedPlan = String(subscriptionPlan).toLowerCase();
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
  }, [subscriptionPlan, subscriptionStatus]);

  const startCheckout = useCallback(async () => {
    if (!product || !hasTopUpAccess) {
      if (!hasTopUpAccess) {
        setPaymentMessage(
          'Monthly subscription required before buying top-up credits.',
        );
      }
      return;
    }
    setPaymentMessage(null);
    const clientSecret = await topUpPaymentIntentMutation.mutateAsync({
      product,
    });
    setPaymentClientSecret(clientSecret);
    setCheckout(true);
  }, [topUpPaymentIntentMutation, hasTopUpAccess, product]);

  const openPortal = useCallback((url?: string) => {
    if (!url) {
      return;
    }
    window.open(url, '_blank', 'noreferrer');
  }, []);

  const onCancelSubscription = useCallback(async () => {
    if (cancelInProgress) {
      return;
    }
    setCancelInProgress(true);
    try {
      const resp = await cancelSubscriptionMutation.mutateAsync();
      if (resp?.portal?.url) {
        openPortal(resp.portal.url);
      }
    } finally {
      setCancelInProgress(false);
    }
  }, [cancelInProgress, cancelSubscriptionMutation, openPortal]);

  const subscriptionSummary = (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'border.default',
        borderRadius: 'var(--borderRadius-medium)',
        backgroundColor: 'canvas.default',
        padding: 'var(--stack-padding-normal)',
        marginBottom: 'var(--stack-gap-normal)',
      }}
    >
      <Text
        as="h3"
        sx={{ fontWeight: 'bold', marginBottom: 'var(--stack-gap-condensed)' }}
      >
        Subscription status
      </Text>
      <Text as="p">Plan: {String(subscriptionPlan)}</Text>
      <Text as="p" sx={{ marginBottom: 'var(--stack-gap-condensed)' }}>
        Status: {String(subscriptionStatus).replaceAll('_', ' ')}
      </Text>
      {remainingRuns !== null && (
        <Text as="p" sx={{ marginBottom: 'var(--stack-gap-normal)' }}>
          Included runs remaining this period: {remainingRuns}
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
            Manage subscription
          </Button>
        )}
        {isPaidSubscription && (
          <Button
            variant="danger"
            onClick={onCancelSubscription}
            disabled={cancelInProgress || cancelSubscriptionMutation.isPending}
          >
            {cancelInProgress || cancelSubscriptionMutation.isPending
              ? 'Opening cancel flow...'
              : 'Cancel subscription'}
          </Button>
        )}
      </Box>
      <Text
        as="p"
        sx={{ color: 'fg.muted', marginTop: 'var(--stack-gap-normal)' }}
      >
        Next step:{' '}
        {isPaidSubscription
          ? 'Keep your subscription active. Top-up credits are available for active monthly subscribers.'
          : 'Start with a monthly subscription in the billing portal before buying top-up credits.'}
      </Text>
    </Box>
  );

  let view = (
    <Box sx={{ minHeight: '40px' }}>
      <Spinner />
    </Box>
  );
  if (checkout) {
    if (stripe && paymentOptions) {
      view = createElement(
        Box,
        { id: 'checkout', sx: { flex: '1 1 auto', display: 'grid', gap: 3 } },
        subscriptionSummary,
        createElement(
          Elements,
          { stripe, options: paymentOptions },
          createElement(StripePaymentForm, { onPaymentSucceeded }),
        ),
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
        {subscriptionSummary}
        {paymentMessage && (
          <Flash variant={hasTopUpAccess ? 'success' : 'warning'}>
            {paymentMessage}
          </Flash>
        )}
        {!hasTopUpAccess && (
          <Flash variant="warning" sx={{ mb: 3 }}>
            Monthly subscription required. Activate a monthly plan first, then
            top-up credits will be available.
          </Flash>
        )}
        <Text as="h3">Choose a credits package</Text>
        <Box
          role="radiogroup"
          sx={{
            display: 'grid',
            gap: 'var(--stack-gap-normal)',
            gridTemplateColumns: Array(items.length).fill('1fr').join(' '),
            padding: 'var(--stack-padding-normal) 0',
          }}
        >
          {items.map(item => (
            <Box
              role="radio"
              aria-labelledby={`checkout-price-${item.id}`}
              aria-checked={product?.id === item.id}
              onClick={() => {
                if (hasTopUpAccess) {
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
                cursor: hasTopUpAccess ? 'pointer' : 'not-allowed',
                opacity: hasTopUpAccess ? 1 : 0.6,
              }}
            >
              <FormControl
                key={item.id}
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
          disabled={product === null || !hasTopUpAccess}
          sx={{ float: 'right' }}
        >
          Checkout
        </Button>
      </Box>
    ) : (
      <Box>
        {subscriptionSummary}
        <Flash variant="danger">
          Unable to fetch the available products. Please try again later.
        </Flash>
      </Box>
    );
  }

  return view;
}
