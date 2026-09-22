/**
 * StripePaymentForm.tsx
 *
 * React component that renders the Stripe Payment Element form.
 *
 * This component is the browser-side integration point for the
 * .NET → Salesforce → Stripe middleware architecture.
 *
 * What this component does:
 *   1. On mount — calls initializePayment() which:
 *        a. Fetches the Stripe publishable key from .NET → Salesforce
 *        b. Creates a PaymentIntent via .NET → Salesforce → Stripe
 *        c. Mounts the Stripe Payment Element (secure card UI)
 *   2. On "Pay" click — calls confirmPayment() which:
 *        a. Validates the Payment Element
 *        b. Calls stripe.confirmPayment() — card data goes DIRECTLY to Stripe
 *        c. Reports success or failure back to the parent
 *
 * Security:
 *   Card numbers, CVV, and expiry dates are captured inside a Stripe-hosted
 *   iframe and sent directly to Stripe servers. They never pass through
 *   the .NET backend or Salesforce.
 *
 * Props:
 *   See StripePaymentFormProps below.
 */

import { useEffect, useRef } from 'react';
import { useStripePayment } from './useStripePayment';
import type { StripePaymentRequest } from './useStripePayment';
import './StripePaymentForm.css';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface StripePaymentFormProps {
  /** Payment details passed from the invoices/payment page. */
  request: StripePaymentRequest;

  /** Base URL for the .NET API. Example: '/api'. */
  apiBaseUrl: string;

  /** Returns the current JWT Authorization header value. */
  getAuthHeader: () => string;

  /** Called when the payment succeeds. Receives the Stripe PaymentIntent ID. */
  onSuccess: (paymentIntentId: string) => void;

  /** Called when the payment fails or an error occurs. */
  onError?: (message: string) => void;

  /** Optional label for the pay button. Defaults to "Pay Now". */
  payButtonLabel?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function StripePaymentForm({
  request,
  apiBaseUrl,
  getAuthHeader,
  onSuccess,
  onError,
  payButtonLabel = 'Pay Now',
}: StripePaymentFormProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);

  const {
    status,
    errorMessage,
    paymentIntentId,
    initializePayment,
    confirmPayment,
    reset,
  } = useStripePayment();

  // ── Mount Stripe Payment Element on load ────────────────────────────────
  useEffect(() => {
    if (initializedRef.current || !mountRef.current) return;
    if (!request.amount || request.amount <= 0) return;

    initializedRef.current = true;

    initializePayment(mountRef.current, request, apiBaseUrl, getAuthHeader).catch(
      (err) => onError?.(err.message ?? 'Stripe initialisation failed.'),
    );

    return () => {
      reset();
      initializedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Notify parent on success ────────────────────────────────────────────
  useEffect(() => {
    if (status === 'succeeded' && paymentIntentId) {
      onSuccess(paymentIntentId);
    }
    if (status === 'failed' && errorMessage) {
      onError?.(errorMessage);
    }
  }, [status, paymentIntentId, errorMessage, onSuccess, onError]);

  // ── Derived state ───────────────────────────────────────────────────────
  const isLoading    = status === 'loading';
  const isReady      = status === 'ready';
  const isProcessing = status === 'processing';
  const isSucceeded  = status === 'succeeded';
  const isFailed     = status === 'failed' || status === 'error';
  const showForm     = isReady || isProcessing;
  const buttonDisabled = !isReady || isProcessing;

  // ── Format display amount ───────────────────────────────────────────────
  const formattedAmount = (() => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: request.currencyCode ?? 'USD',
      }).format(request.amount);
    } catch {
      return `${request.amount} ${request.currencyCode ?? 'USD'}`;
    }
  })();

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="spf-container" role="region" aria-label="Payment form">
      {/* ── Header ── */}
      <div className="spf-header">
        <span className="spf-label">Amount due</span>
        <span className="spf-amount">{formattedAmount}</span>
      </div>

      {/* ── Loading skeleton ── */}
      {isLoading && (
        <div className="spf-loading" aria-live="polite" aria-label="Loading payment form">
          <div className="spf-skeleton" />
          <div className="spf-skeleton spf-skeleton--short" />
          <div className="spf-skeleton" />
        </div>
      )}

      {/* ── Stripe Payment Element mount point ── */}
      {/* Stripe.js renders a secure, PCI-compliant card input here. */}
      {/* Card data goes directly to Stripe — never to this app's backend. */}
      <div
        id="stripe-payment-element"
        ref={mountRef}
        className={`spf-element ${showForm ? 'spf-element--visible' : ''}`}
        aria-hidden={!showForm}
      />

      {/* ── Error message ── */}
      {isFailed && errorMessage && (
        <div className="spf-error" role="alert" aria-live="assertive">
          <span className="spf-error-icon" aria-hidden="true">⚠</span>
          {errorMessage}
        </div>
      )}

      {/* ── Success message ── */}
      {isSucceeded && (
        <div className="spf-success" role="status" aria-live="polite">
          <span className="spf-success-icon" aria-hidden="true">✓</span>
          Payment successful!
        </div>
      )}

      {/* ── Pay button ── */}
      {showForm && (
        <button
          id="stripe-pay-button"
          type="button"
          className={`spf-pay-button ${isProcessing ? 'spf-pay-button--processing' : ''}`}
          disabled={buttonDisabled}
          onClick={confirmPayment}
          aria-label={isProcessing ? 'Processing payment…' : `${payButtonLabel} ${formattedAmount}`}
        >
          {isProcessing ? (
            <>
              <span className="spf-spinner" aria-hidden="true" />
              Processing…
            </>
          ) : (
            `${payButtonLabel} ${formattedAmount}`
          )}
        </button>
      )}

      {/* ── Security badge ── */}
      {showForm && (
        <p className="spf-security-note" aria-label="Secure payment information">
          🔒 Payments are processed securely by Stripe. Card details never leave your browser.
        </p>
      )}
    </div>
  );
}
