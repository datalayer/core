/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { createElement, useCallback, useEffect, useState } from 'react';
import { Button, Flash, FormControl, Spinner, Text } from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import type { Stripe } from '@stripe/stripe-js';
import { useCache } from '../../hooks';
import type { ICheckoutPortal } from '../../models';
import { useIAMStore } from '../../state';

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

/**
 * Stripe checkout.
 */
export function StripeCheckout({
  checkoutPortal,
}: {
  checkoutPortal: ICheckoutPortal | null;
}) {
  const { iamRunUrl } = useIAMStore();
  const { createCheckoutSession, refreshStripePrices } = useCache();
  const [stripe, setStripe] = useState<Promise<Stripe | null> | null>(null);
  const [components, setComponents] = useState<any>(null);
  const [items, setItems] = useState<IPrice[] | null>(null);
  const [product, setProduct] = useState<IPrice | null>(null);
  const [checkout, setCheckout] = useState<boolean>(false);
  // Refresh Stripe items.
  useEffect(() => {
    refreshStripePrices()
      .then(response => {
        if (response.success) {
          setItems(response.prices);
        } else {
          setItems([]);
        }
      })
      .catch(error => {
        console.error('Failed to fetch product items.', error);
        setItems([]);
      });
  }, []);
  // Load stripe components.
  useEffect(() => {
    import('@stripe/react-stripe-js').then(module => {
      setComponents(module);
    });
  }, []);
  // Load stripe API
  useEffect(() => {
    if (checkoutPortal?.metadata?.stripe_key) {
      import('@stripe/stripe-js').then(module => {
        setStripe(module.loadStripe(checkoutPortal.metadata!.stripe_key));
      });
    }
  }, [checkoutPortal?.metadata?.stripe_key]);
  const fetchClientSecret = useCallback(() => {
    const location = document.location;
    // Create a Checkout Session.
    return createCheckoutSession(product, location);
  }, [iamRunUrl, location, product?.id]);
  const options = { fetchClientSecret };
  let view = (
    <Box sx={{ minHeight: '40px' }}>
      <Spinner />
    </Box>
  );
  if (checkout) {
    if (stripe && components) {
      view = createElement(
        Box,
        { id: 'checkout', sx: { flex: '1 1 auto' } },
        createElement(
          components.EmbeddedCheckoutProvider,
          { stripe, options },
          createElement(components.EmbeddedCheckout),
        ),
      );
    }
  } else if (items) {
    view = items.length ? (
      <Box
        sx={{ flex: '1 1 auto' }}
        onKeyDown={event => {
          if (product && event.key === 'Enter') {
            setCheckout(true);
          }
        }}
      >
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
            setCheckout(true);
          }}
          disabled={product === null}
          sx={{ float: 'right' }}
        >
          Checkout
        </Button>
      </Box>
    ) : (
      <Box>
        <Flash variant="danger">
          Unable to fetch the available products. Please try again later.
        </Flash>
      </Box>
    );
  }

  return view;
}
