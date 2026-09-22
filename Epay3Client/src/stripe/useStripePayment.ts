/**
 * useStripePayment.ts
 *
 * React hook that manages the complete Stripe payment flow for the
 * .NET → Salesforce → Stripe middleware architecture.
 *
 * Payment Flow:
 *   1. Fetch publishable key  →  GET  /api/stripe/config  (via .NET → SF)
 *   2. Create PaymentIntent   →  POST /api/stripe/payment-intent  (via .NET → SF → Stripe)
 *   3. Mount Payment Element  →  Stripe.js renders secure card UI in the browser
 *   4. Confirm Payment        →  stripe.confirmPayment()  (card data → Stripe directly)
 *   5. Poll Status            →  GET  /api/stripe/payment-intent/{id}  (via .NET → SF → Stripe)
 *
 * Security:
 *   Card numbers, CVV, and expiry dates never leave the browser via this hook.
 *   Stripe.js handles them directly within its secure iframe.
 */

import { useCallback, useRef, useState } from 'react';
import type { Stripe, StripeElements } from '@stripe/stripe-js';
import { getStripe } from './stripeLoader';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface StripePaymentRequest {
  /** Payment amount in standard currency units (e.g. 250.00 for $250.00). */
  amount: number;
  /** ISO 4217 currency code. Defaults to 'USD'. */
  currencyCode?: string;
  /** Customer name for Stripe metadata. */
  customerName?: string;
  /** Customer email for Stripe metadata and receipt. */
  customerEmail?: string;
  /** Comma-separated invoice numbers. */
  invoiceNumber?: string;
  /** Human-readable description for the Stripe Dashboard. */
  description?: string;
  /** Optional Stripe Customer Id (cus_xxx) to attach the PaymentIntent and save card. */
  customerId?: string;
  /** Whether to save the card for future off_session usage (defaults to true). */
  setupFutureUsage?: boolean;
}

export interface StripePaymentIntentResponse {
  paymentIntentId: string;
  clientSecret: string;
  status: string;
  amount: number;
  currencyCode: string;
}

export type StripePaymentStatus =
  | 'idle'
  | 'loading'
  | 'ready'       // Payment Element mounted, waiting for user input
  | 'processing'  // stripe.confirmPayment() in progress
  | 'succeeded'
  | 'failed'
  | 'error';

export interface UseStripePaymentResult {
  status: StripePaymentStatus;
  errorMessage: string | null;
  paymentIntentId: string | null;

  /**
   * Initialises Stripe.js, creates a PaymentIntent, and mounts the
   * Stripe Payment Element into the given DOM container.
   *
   * @param containerElement  The DOM element to mount the Payment Element into.
   * @param request           Payment details (amount, currency, invoice info).
   * @param apiBaseUrl        Base URL for the .NET API (e.g. '/api').
   * @param getAuthHeader     Function that returns the current Authorization header value.
   */
  initializePayment: (
    containerElement: HTMLElement,
    request: StripePaymentRequest,
    apiBaseUrl: string,
    getAuthHeader: () => string,
  ) => Promise<void>;

  /**
   * Confirms the payment. Call this when the user clicks the "Pay" button.
   * Card data is sent directly to Stripe from the browser — not via .NET.
   */
  confirmPayment: () => Promise<void>;

  /** Resets all state (useful for retry or navigating away). */
  reset: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useStripePayment(): UseStripePaymentResult {
  const [status, setStatus] = useState<StripePaymentStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);

  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const clientSecretRef = useRef<string | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const buildHeaders = (getAuthHeader: () => string) => ({
    'Content-Type': 'application/json',
    'Authorization': getAuthHeader(),
  });

  const apiGet = async <T>(
    url: string,
    getAuthHeader: () => string,
  ): Promise<T> => {
    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(getAuthHeader),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(err.error ?? `HTTP ${response.status}`);
    }
    return response.json() as Promise<T>;
  };

  const apiPost = async <T>(
    url: string,
    body: unknown,
    getAuthHeader: () => string,
  ): Promise<T> => {
    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(getAuthHeader),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(err.error ?? `HTTP ${response.status}`);
    }
    return response.json() as Promise<T>;
  };


  // ── initializePayment ─────────────────────────────────────────────────────

  const initializePayment = useCallback(async (
    containerElement: HTMLElement,
    request: StripePaymentRequest,
    apiBaseUrl: string,
    getAuthHeader: () => string,
  ) => {
    setStatus('loading');
    setErrorMessage(null);
    setPaymentIntentId(null);

    try {
      // Step 1 — Fetch publishable key from .NET → Salesforce → Custom Metadata
      const { publishableKey } = await apiGet<{ publishableKey: string }>(
        `${apiBaseUrl}/stripe/config`,
        getAuthHeader,
      );

      if (!publishableKey) {
        throw new Error('Stripe publishable key is not configured.');
      }

      // Step 2 — Load Stripe.js (singleton, cached after first load)
      const stripe = await getStripe(publishableKey);
      if (!stripe) {
        throw new Error('Failed to load Stripe.js.');
      }
      stripeRef.current = stripe;

      // Step 3 — Create PaymentIntent via .NET → Salesforce → Stripe
      const intentResponse = await apiPost<StripePaymentIntentResponse>(
        `${apiBaseUrl}/stripe/payment-intent`,
        {
          amount: request.amount,
          currencyCode: request.currencyCode ?? 'USD',
          customerName: request.customerName,
          customerEmail: request.customerEmail,
          invoiceNumber: request.invoiceNumber,
          description: request.description,
          customerId: request.customerId,
          setupFutureUsage: request.setupFutureUsage ?? true,
        },
        getAuthHeader,
      );

      if (!intentResponse.clientSecret) {
        throw new Error('Stripe PaymentIntent clientSecret is missing.');
      }

      clientSecretRef.current = intentResponse.clientSecret;
      setPaymentIntentId(intentResponse.paymentIntentId);

      // Step 4 — Initialise Stripe Elements with the clientSecret
      const elements = stripe.elements({
        clientSecret: intentResponse.clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#0176d3',
            borderRadius: '6px',
            fontFamily: 'Inter, Arial, sans-serif',
          },
        },
      });
      elementsRef.current = elements;

      // Step 5 — Create and mount the Stripe Payment Element
      // The Payment Element renders a secure, PCI-compliant card input inside a Stripe iframe.
      // Card data entered here goes DIRECTLY to Stripe — never to .NET or Salesforce.
      const paymentElement = elements.create('payment');
      paymentElement.mount(containerElement);

      setStatus('ready');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Stripe initialisation failed.';
      setErrorMessage(message);
      setStatus('error');
    }
  }, []);


  // ── confirmPayment ────────────────────────────────────────────────────────

  const confirmPayment = useCallback(async () => {
    if (!stripeRef.current || !elementsRef.current || !clientSecretRef.current) {
      setErrorMessage('Payment form is not ready. Please wait and try again.');
      return;
    }

    setStatus('processing');
    setErrorMessage(null);

    try {
      // Step 1 — Ask Stripe Elements to validate the user's card input
      const { error: submitError } = await elementsRef.current.submit();
      if (submitError) {
        throw new Error(submitError.message ?? 'Card validation failed.');
      }

      // Step 2 — Confirm the PaymentIntent
      // Card data goes DIRECTLY from the browser to Stripe. It never touches .NET or Salesforce.
      const { error, paymentIntent } = await stripeRef.current.confirmPayment({
        elements: elementsRef.current,
        clientSecret: clientSecretRef.current,
        redirect: 'if_required',
      });

      if (error) {
        throw new Error(error.message ?? 'Payment confirmation failed.');
      }

      if (paymentIntent?.status === 'succeeded') {
        setStatus('succeeded');
        setPaymentIntentId(paymentIntent.id);
      } else if (paymentIntent?.status === 'processing') {
        // Async payment (e.g. bank transfer) — still in progress
        setStatus('processing');
      } else {
        throw new Error(`Unexpected payment status: ${paymentIntent?.status}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed.';
      setErrorMessage(message);
      setStatus('failed');
    }
  }, []);


  // ── reset ─────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    stripeRef.current = null;
    elementsRef.current = null;
    clientSecretRef.current = null;
    setStatus('idle');
    setErrorMessage(null);
    setPaymentIntentId(null);
  }, []);


  return {
    status,
    errorMessage,
    paymentIntentId,
    initializePayment,
    confirmPayment,
    reset,
  };
}
