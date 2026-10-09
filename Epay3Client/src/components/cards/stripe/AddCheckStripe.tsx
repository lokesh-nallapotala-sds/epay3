import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { useAppDispatch } from 'redux/hooks';
import { addSessionCard } from 'redux/reducers/sessionCardsSlice';
import { usePayerDetails } from 'providers/PayerDetailsProvider';
import { useEpayToast } from 'providers/EpayToastProvider';
import { getStripe } from '../../../stripe/stripeLoader';
import { getCsrfHeaders } from 'utilities/csrf';
import { PaymentCard } from 'types/Payment';
import './AddCheckStripe.css';

interface AddCheckStripeProps {
  onClose: () => void;
  onSuccess?: (card: PaymentCard) => void;
}

export const AddCheckStripe = ({ onClose, onSuccess }: AddCheckStripeProps) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const { showToastMessage } = useEpayToast();
  const { effectivePayer, effectiveAccount: selectedAccount, refreshPayerDetails } = usePayerDetails();

  const [accountHolderName, setAccountHolderName] = useState<string>(
    selectedAccount?.address?.name || ''
  );
  const [routingNumber, setRoutingNumber] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState<string>('');
  const [accountType, setAccountType] = useState<'checking' | 'savings'>('checking');
  const [accountHolderType, setAccountHolderType] = useState<'company' | 'individual'>('company');
  const [saveOnFile, setSaveOnFile] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const f = (id: string, defaultMsg: string = id) =>
    intl.formatMessage({ id, defaultMessage: defaultMsg });

  const validateAbaRouting = (routing: string): boolean => {
    if (!/^\d{9}$/.test(routing)) return false;
    const d = routing.split('').map(Number);
    const checksum =
      (3 * (d[0] + d[3] + d[6]) +
       7 * (d[1] + d[4] + d[7]) +
       1 * (d[2] + d[5] + d[8])) % 10;
    return checksum === 0;
  };

  const handleFillTestDetails = () => {
    setRoutingNumber('110000000');
    setAccountNumber('000123456789');
    setConfirmAccountNumber('000123456789');
    setAccountType('checking');
    if (!accountHolderName) {
      setAccountHolderName(selectedAccount?.address?.name || 'Rutherford Group');
    }
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const name = accountHolderName.trim();
    if (!name) {
      setErrorMessage('Please enter the bank account holder name.');
      return;
    }

    const routing = routingNumber.trim();
    if (!/^\d{9}$/.test(routing)) {
      setErrorMessage('Routing number must be exactly 9 digits.');
      return;
    }

    if (!validateAbaRouting(routing)) {
      setErrorMessage(
        'Invalid routing number checksum. For Stripe test mode, use 110000000 (Stripe Test Bank) or 021000021 (Chase).'
      );
      return;
    }

    const acct = accountNumber.trim();
    if (!/^\d{4,17}$/.test(acct)) {
      setErrorMessage('Account number must be between 4 and 17 digits.');
      return;
    }

    if (acct !== confirmAccountNumber.trim()) {
      setErrorMessage('Account number and confirmation do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Fetch Stripe config
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

      if (!publishableKey) {
        publishableKey = 'pk_test_51Tl7yORpGYyK4c4urnN0IJgygsC0I3WRauWEFdrirAKocEVvj7TydvOM2EGG3kUCPbwsR2G3XrfUhzyHBBHiZ5sB00RJ4N7iRX';
      }

      let tokenObj: any = null;
      try {
        const stripe = await getStripe(publishableKey);
        if (stripe) {
          const { token, error: stripeError } = await (stripe as any).createToken('bank_account', {
            country: 'US',
            currency: 'usd',
            routing_number: routing,
            account_number: acct,
            account_holder_name: name,
            account_holder_type: accountHolderType,
          });

          if (stripeError) {
            if (
              stripeError.code === 'routing_number_invalid' ||
              stripeError.param === 'bank_account[routing_number]' ||
              stripeError.message?.toLowerCase().includes('routing number')
            ) {
              throw new Error(
                'Invalid routing number. In Stripe test mode, please use 110000000 (Stripe Test Bank) or 021000021 (Chase).'
              );
            }
            throw new Error(stripeError.message || 'Bank account tokenization failed.');
          }
          tokenObj = token;
        }
      } catch (tokenErr: any) {
        console.error('Direct Stripe bank tokenization error:', tokenErr);
        throw tokenErr;
      }

      // Generate token ID
      const last4 = acct.slice(-4);
      let generatedTokenId = tokenObj?.id || `btok_ec_${Date.now()}_${last4}`;
      const bankName = tokenObj?.bank_account?.bank_name || 'Bank Account';

      const resolvedAccountId =
        selectedAccount?.accountId ||
        selectedAccount?.primaryAcct ||
        effectivePayer ||
        null;

      // 2. Attach / save in Salesforce / Stripe if saveOnFile is enabled
      if (saveOnFile) {
        const csrfHeaders = await getCsrfHeaders();
        const apiResponse = await fetch('/api/stripe/payment-method', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...csrfHeaders,
          },
          body: JSON.stringify({
            paymentMethodId: generatedTokenId,
            customerId: null,
            accountId: resolvedAccountId,
            cardholderName: name,
            setDefault: true,
          }),
        });

        if (!apiResponse.ok) {
          const errText = await apiResponse.text();
          console.error('Backend returned status', apiResponse.status, errText);
          let parsedMsg = 'Failed to save bank account under customer in Stripe.';
          try {
            const parsedErr = JSON.parse(errText);
            if (parsedErr.error) parsedMsg = parsedErr.error;
            else if (parsedErr.message) parsedMsg = parsedErr.message;
          } catch (ignored) {}
          throw new Error(parsedMsg);
        }

        const savedData = await apiResponse.json();
        if (savedData?.paymentMethodId) {
          generatedTokenId = savedData.paymentMethodId;
        }
      }

      // 3. Create PaymentCard object for local session / Redux
      const newPaymentCard: PaymentCard = {
        paymentCardType: 'EC',
        gatewayCardType: 'EC',
        sapCardType: 'EC',
        paymentCardToken: generatedTokenId,
        paymentCardName: name,
        cardLast4Digit: last4,
        validTo: '',
        isSession: !saveOnFile,
        default: '',
        isDefault: false,
      };

      // 4. Update Redux state
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

      showToastMessage('success', f('Bank account added successfully.'));
      onSuccess?.(newPaymentCard);
      onClose();
    } catch (err: any) {
      console.error('Error adding bank account:', err);
      const msg = err instanceof Error ? err.message : 'Failed to add bank account.';
      setErrorMessage(msg);
      showToastMessage('error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="stripe-add-check-container">
      <div className="stripe-add-check-header">
        <h2 className="stripe-add-check-title">{f('Add Bank Account (eCheck)')}</h2>
        <p className="stripe-add-check-subtitle">
          {f('Enter your US bank account routing and account numbers for ACH / eCheck payments.')}
        </p>
      </div>

      {errorMessage && (
        <div className="stripe-error-message" role="alert">
          {errorMessage}
        </div>
      )}

      <div className="stripe-test-helper">
        <span>
          💡 <strong>Stripe Test Mode</strong>: Routing <code>110000000</code> | Account <code>000123456789</code>
        </span>
        <button
          type="button"
          className="stripe-btn-fill-test"
          onClick={handleFillTestDetails}
        >
          Fill Test Details
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="stripe-field-group">
          <label className="stripe-field-label" htmlFor="check-holder-name">
            {f('Account Holder Name')}
          </label>
          <input
            id="check-holder-name"
            className="stripe-text-input"
            type="text"
            placeholder={f('Name on bank account')}
            value={accountHolderName}
            onChange={(e) => setAccountHolderName(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="stripe-field-row">
          <div className="stripe-field-col">
            <label className="stripe-field-label" htmlFor="check-routing-number">
              {f('Routing Number')}
            </label>
            <input
              id="check-routing-number"
              className="stripe-text-input"
              type="text"
              inputMode="numeric"
              maxLength={9}
              placeholder="9 digits (e.g. 110000000)"
              value={routingNumber}
              onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, ''))}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="stripe-field-col">
            <label className="stripe-field-label" htmlFor="check-account-type">
              {f('Account Type')}
            </label>
            <select
              id="check-account-type"
              className="stripe-select-input"
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as 'checking' | 'savings')}
              disabled={isSubmitting}
            >
              <option value="checking">{f('Checking')}</option>
              <option value="savings">{f('Savings')}</option>
            </select>
          </div>
        </div>

        <div className="stripe-field-row">
          <div className="stripe-field-col">
            <label className="stripe-field-label" htmlFor="check-account-number">
              {f('Account Number')}
            </label>
            <input
              id="check-account-number"
              className="stripe-text-input"
              type="password"
              inputMode="numeric"
              maxLength={17}
              placeholder="Account number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="stripe-field-col">
            <label className="stripe-field-label" htmlFor="check-confirm-account-number">
              {f('Confirm Account Number')}
            </label>
            <input
              id="check-confirm-account-number"
              className="stripe-text-input"
              type="text"
              inputMode="numeric"
              maxLength={17}
              placeholder="Re-enter account number"
              value={confirmAccountNumber}
              onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ''))}
              disabled={isSubmitting}
              required
            />
          </div>
        </div>

        <div className="stripe-field-group">
          <label className="stripe-field-label" htmlFor="check-holder-type">
            {f('Account Ownership')}
          </label>
          <select
            id="check-holder-type"
            className="stripe-select-input"
            value={accountHolderType}
            onChange={(e) => setAccountHolderType(e.target.value as 'company' | 'individual')}
            disabled={isSubmitting}
          >
            <option value="company">{f('Company / Business')}</option>
            <option value="individual">{f('Individual / Personal')}</option>
          </select>
        </div>

        <label className="stripe-checkbox-label">
          <input
            type="checkbox"
            checked={saveOnFile}
            onChange={(e) => setSaveOnFile(e.target.checked)}
            disabled={isSubmitting}
          />
          <span>{f('Save this bank account on file for future payments')}</span>
        </label>

        <div className="stripe-nacha-notice">
          {f(
            'By providing your bank account details, you authorize ChronarPay / Stripe to electronically debit your account for invoices paid.'
          )}
        </div>

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
                <div className="stripe-spinner" />
                <span>{f('Saving...')}</span>
              </>
            ) : (
              <span>{f('Add Bank Account')}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddCheckStripe;
