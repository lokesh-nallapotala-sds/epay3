import { useEffect, useRef, useState, useCallback } from 'react';
import { useIntl } from 'react-intl';
import type { Stripe, StripeCardElement, StripeElements } from '@stripe/stripe-js';
import { useAppDispatch } from 'redux/hooks';
import { addSessionCard } from 'redux/reducers/sessionCardsSlice';
import { usePayerDetails } from 'providers/PayerDetailsProvider';
import { useEpayToast } from 'providers/EpayToastProvider';
import { getStripe } from '../../../stripe/stripeLoader';
import { getCsrfHeaders } from 'utilities/csrf';
import { PaymentCard } from 'types/Payment';
import './AddCardStripe.css';

interface AddCardStripeProps {
  onClose: () => void;
  onSuccess?: (card: PaymentCard) => void;
}

const mapStripeBrandToCardType = (brand?: string): string => {
  switch ((brand || '').toLowerCase()) {
    case 'visa':
      return 'VISA';
    case 'mastercard':
      return 'MC';
    case 'amex':
    case 'american express':
      return 'AMEX';
    case 'discover':
      return 'DISC';
    case 'diners':
    case 'diners club':
      return 'DINERS';
    case 'jcb':
      return 'JCB';
    default:
      return (brand || 'CC').toUpperCase();
  }
};

export const AddCardStripe = ({ onClose, onSuccess }: AddCardStripeProps) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const { showToastMessage } = useEpayToast();
  const { effectivePayer, effectiveAccount: selectedAccount, refreshPayerDetails } = usePayerDetails();

  const [cardholderName, setCardholderName] = useState<string>('');
  const [saveOnFile, setSaveOnFile] = useState<boolean>(true);
  const [isLoadingStripe, setIsLoadingStripe] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cardElementRef = useRef<HTMLDivElement | null>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const cardElementInstance = useRef<StripeCardElement | null>(null);

  const f = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id, defaultMessage: id }, values);

  const initStripe = useCallback(async () => {
    try {
      setIsLoadingStripe(true);
      setErrorMessage(null);

      // Fetch publishable key from .NET middleware
      let publishableKey: string | null = null;
      try {
        const configRes = await fetch('/api/stripe/config');
        if (configRes.ok) {
          const configData = await configRes.json();
          publishableKey = configData.publishableKey;
        }
      } catch (err) {
        console.warn('Could not fetch config from /api/stripe/config:', err);
      }

      // Fallback default test key if config endpoint returns empty
      if (!publishableKey) {
        publishableKey = 'pk_test_51Ssmw7FjM5kKx07o1tXz8gJqV'; // fallback safe placeholder
      }

      const stripe = await getStripe(publishableKey);
      if (!stripe) {
        throw new Error('Failed to load Stripe.js');
      }

      stripeRef.current = stripe;

      if (!cardElementRef.current) return;

      const elements = stripe.elements();
      elementsRef.current = elements;

      const card = elements.create('card', {
        style: {
          base: {
            fontSize: '14px',
            color: '#1a1f36',
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            '::placeholder': {
              color: '#a0aec0',
            },
          },
          invalid: {
            color: '#df1b41',
            iconColor: '#df1b41',
          },
        },
        hidePostalCode: false,
      });

      card.mount(cardElementRef.current);
      cardElementInstance.current = card;

      card.on('change', (event) => {
        if (event.error) {
          setErrorMessage(event.error.message);
        } else {
          setErrorMessage(null);
        }
      });

      setIsLoadingStripe(false);
    } catch (err) {
      console.error('Stripe initialization failed:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to initialize payment form.');
      setIsLoadingStripe(false);
    }
  }, []);

  useEffect(() => {
    initStripe();

    return () => {
      if (cardElementInstance.current) {
        try {
          cardElementInstance.current.destroy();
        } catch (ignored) {}
      }
    };
  }, [initStripe]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripeRef.current || !cardElementInstance.current) {
      setErrorMessage('Stripe is not ready yet. Please try again.');
      return;
    }

    if (!cardholderName.trim()) {
      setErrorMessage('Please enter the name on the card.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const stripe = stripeRef.current;
      const cardElement = cardElementInstance.current;

      const { paymentMethod, error: stripeError } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: cardholderName.trim(),
        },
      });

      if (stripeError) {
        setErrorMessage(stripeError.message || 'Card validation failed.');
        setIsSubmitting(false);
        return;
      }

      if (!paymentMethod || !paymentMethod.card) {
        setErrorMessage('Failed to tokenize card.');
        setIsSubmitting(false);
        return;
      }

      const cardBrand = mapStripeBrandToCardType(paymentMethod.card.brand);
      const expMonth = String(paymentMethod.card.exp_month).padStart(2, '0');
      const expYear = String(paymentMethod.card.exp_year);
      const last4 = paymentMethod.card.last4;

      const newPaymentCard: PaymentCard = {
        paymentCardType: cardBrand,
        gatewayCardType: cardBrand,
        sapCardType: cardBrand,
        paymentCardToken: paymentMethod.id,
        paymentCardName: cardholderName.trim(),
        cardLast4Digit: last4,
        validTo: `${expYear}-${expMonth}-01`,
        isSession: !saveOnFile,
        default: '',
        isDefault: false,
      };

      // If saving on file, call the backend to attach to customer and sync to Salesforce
      if (saveOnFile) {
        const resolvedAccountId =
          selectedAccount?.accountId ||
          selectedAccount?.primaryAcct ||
          effectivePayer ||
          null;

        const csrfHeaders = await getCsrfHeaders();
        const apiResponse = await fetch('/api/stripe/payment-method', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...csrfHeaders,
          },
          body: JSON.stringify({
            paymentMethodId: paymentMethod.id,
            customerId: null,
            accountId: resolvedAccountId,
            cardholderName: cardholderName.trim(),
            setDefault: true,
          }),
        });

        if (!apiResponse.ok) {
          const errText = await apiResponse.text();
          console.error(
            'Backend failed to attach payment method to Stripe customer:',
            apiResponse.status,
            errText
          );
          let parsedMsg = 'Failed to save card under customer in Stripe.';
          try {
            const parsedErr = JSON.parse(errText);
            if (parsedErr.error) parsedMsg = parsedErr.error;
            else if (parsedErr.message) parsedMsg = parsedErr.message;
          } catch (ignored) {}
          throw new Error(parsedMsg);
        }
      }

      // Add to Redux session state so it immediately shows in the UI cards list
      dispatch(
        addSessionCard({
          paymentCard: newPaymentCard,
          payer: effectivePayer,
        })
      );

      if (saveOnFile) {
        try {
          await refreshPayerDetails(true);
        } catch (ignored) {}
      }

      showToastMessage('success', f('payment_methods.adding_card.success_message'));
      onSuccess?.(newPaymentCard);
      onClose();
    } catch (err) {
      console.error('Error adding card:', err);
      const msg = err instanceof Error ? err.message : 'Failed to add card.';
      setErrorMessage(msg);
      showToastMessage('error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="stripe-add-card-container">
      <div className="stripe-add-card-header">
        <h2 className="stripe-add-card-title">{f('Add New Card')}</h2>
        <p className="stripe-add-card-subtitle">
          {f('Secure Card Addition Info')}
        </p>
      </div>

      {errorMessage && (
        <div className="stripe-error-message" role="alert">
          {errorMessage}
        </div>
      )}

      {isLoadingStripe ? (
        <div className="stripe-loading-indicator">
          <div className="stripe-spinner" />
          <span>{f('Loading')}</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} style={{ display: isLoadingStripe ? 'none' : 'block' }}>
        <div className="stripe-field-group">
          <label className="stripe-field-label" htmlFor="stripe-cardholder-name">
            {f('Name on Card')}
          </label>
          <input
            id="stripe-cardholder-name"
            className="stripe-text-input"
            type="text"
            placeholder={f('Cardholder Name')}
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="stripe-field-group">
          <label className="stripe-field-label">
            {f('Card Details')}
          </label>
          <div className="stripe-element-box" ref={cardElementRef} />
        </div>

        <label className="stripe-checkbox-label">
          <input
            type="checkbox"
            checked={saveOnFile}
            onChange={(e) => setSaveOnFile(e.target.checked)}
            disabled={isSubmitting}
          />
          <span>{f('Save card for future use')}</span>
        </label>

        <div className="stripe-actions">
          <button
            type="button"
            className="stripe-btn-cancel"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {f('Cancel')}
          </button>
          <button
            type="submit"
            className="stripe-btn-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="stripe-spinner" style={{ width: 14, height: 14, borderWidth: 2, margin: 0 }} />
                <span>{f('Processing')}</span>
              </>
            ) : (
              <span>{f('Add Card')}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddCardStripe;
