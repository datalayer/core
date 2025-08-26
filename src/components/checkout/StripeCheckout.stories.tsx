/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { StripeCheckout } from './StripeCheckout';
import type { ICheckoutPortal } from '../../models';

const meta = {
  title: 'Datalayer/Checkout/StripeCheckout',
  component: StripeCheckout,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof StripeCheckout>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockCheckoutPortal: ICheckoutPortal = {
  route: '/checkout',
  is_modal: false,
  metadata: {
    stripe_key: 'pk_test_mock_stripe_key',
  },
};

const mockCheckoutPortalModal: ICheckoutPortal = {
  url: 'https://checkout.stripe.com/test',
  is_modal: true,
  metadata: {
    stripe_key: 'pk_test_mock_stripe_key',
  },
};

export const Default: Story = {
  args: {
    checkoutPortal: mockCheckoutPortal,
  },
};

export const Modal: Story = {
  args: {
    checkoutPortal: mockCheckoutPortalModal,
  },
};

export const NoPortal: Story = {
  args: {
    checkoutPortal: null,
  },
};
