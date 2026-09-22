/**
 * stripeLoader.ts
 *
 * Lazy Stripe.js loader with singleton caching.
 *
 * Stripe.js is loaded dynamically from https://js.stripe.com/v3/ to ensure
 * PCI compliance. The browser communicates card data directly to Stripe
 * using the publishable key — card data never reaches .NET or Salesforce.
 *
 * Usage:
 *   const stripe = await getStripe(publishableKey);
 *   const elements = stripe.elements({ clientSecret });
 */

import type { Stripe } from '@stripe/stripe-js';

// Module-level cache — one Stripe instance per publishable key per page load.
let stripeInstance: Stripe | null = null;
let loadedPublishableKey: string | null = null;
let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Returns a Stripe.js instance initialised with the given publishable key.
 *
 * - Loads the Stripe.js script lazily on first call.
 * - Returns the cached instance on subsequent calls if the key is the same.
 * - If the key changes (e.g. switching environments), a new instance is created.
 *
 * @param publishableKey Stripe publishable key (pk_test_... or pk_live_...).
 */
export async function getStripe(publishableKey: string): Promise<Stripe | null> {
  if (!publishableKey) {
    throw new Error('[StripeLoader] publishableKey must not be empty.');
  }

  // Return cached instance if key has not changed.
  if (stripeInstance && loadedPublishableKey === publishableKey) {
    return stripeInstance;
  }

  // Reset cache if the key has changed.
  if (loadedPublishableKey !== publishableKey) {
    stripeInstance = null;
    stripePromise = null;
  }

  if (!stripePromise) {
    // Dynamically import @stripe/stripe-js only when needed.
    stripePromise = import('@stripe/stripe-js').then(({ loadStripe }) =>
      loadStripe(publishableKey)
    );
  }

  stripeInstance = await stripePromise;
  loadedPublishableKey = publishableKey;

  return stripeInstance;
}

/**
 * Resets the cached Stripe instance.
 * Useful in tests or when switching publishable keys.
 */
export function resetStripeCache(): void {
  stripeInstance = null;
  loadedPublishableKey = null;
  stripePromise = null;
}
