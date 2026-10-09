import { useEffect, useRef, useState, useMemo } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  TextField,
  Typography,
  Alert,
  Chip,
  Paper,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import type { Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';
import { getStripe } from './stripeLoader';
import PaymentLogo from '../shared/components/PaymentLogo';
import { toCurrencySymbol } from '../utilities/utilities';
import { getCsrfHeaders } from '../utilities/csrf';

export interface CheckoutInvoice {
  billingDocumentNumber?: string;
  referenceNumber?: string;
  dueDate?: string;
  documentDate?: string;
  totalAmount?: number;
  openAmount?: number;
  paymentAmount?: number;
  currencyKey?: string;
  accountNumber?: string;
  status?: string;
}

export interface CustomerDetails {
  customerId?: string;
  accountName?: string;
  accountNumber?: string;
  email?: string;
  phone?: string;
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  billingCountry?: string;
}

export interface SavedPaymentMethod {
  id: string;
  type?: string;
  card?: {
    brand?: string;
    last4?: string;
    expMonth?: number;
    expYear?: number;
    exp_month?: number;
    exp_year?: number;
  };
  billingDetails?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  billing_details?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  isFallback?: boolean;
}

interface ChronarpayCheckoutProps {
  invoices: CheckoutInvoice[];
  accountId: string;
  accountNumber?: string;
  accountName?: string;
  userEmail?: string;
  initialCards?: any[];
  onBack: () => void;
  onPaymentSuccess?: (paymentIntentId: string, details: any) => void;
}

export default function ChronarpayCheckout({
  invoices: initialInvoices,
  accountId,
  accountNumber = '',
  accountName = '',
  userEmail = '',
  initialCards = [],
  onBack,
  onPaymentSuccess,
}: ChronarpayCheckoutProps) {
  const [invoicesList, setInvoicesList] = useState<CheckoutInvoice[]>(
    initialInvoices.map((inv) => ({
      ...inv,
      paymentAmount: inv.paymentAmount ?? inv.openAmount ?? inv.totalAmount ?? 0,
    }))
  );

  const [customer, setCustomer] = useState<CustomerDetails>({
    accountName,
    accountNumber,
    email: userEmail,
  });
  const [savedCards, setSavedCards] = useState<SavedPaymentMethod[]>([]);
  const [paymentMode, setPaymentMode] = useState<'existing' | 'new'>('existing');
  const [selectedSavedCardId, setSelectedSavedCardId] = useState<string>('');
  const [saveCardForFuture, setSaveCardForFuture] = useState<boolean>(true);

  const [publishableKey, setPublishableKey] = useState<string>('');
  const [isLoadingCustomer, setIsLoadingCustomer] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [paymentElementLoading, setPaymentElementLoading] = useState<boolean>(false);
  const [paymentElementReady, setPaymentElementReady] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<any | null>(null);

  const paymentElementContainerRef = useRef<HTMLDivElement | null>(null);
  const stripeInstanceRef = useRef<Stripe | null>(null);
  const elementsInstanceRef = useRef<StripeElements | null>(null);
  const paymentElementInstanceRef = useRef<StripePaymentElement | null>(null);
  const lastLoadedAccountRef = useRef<string | null>(null);
  const isLoadingCustomerRef = useRef<boolean>(false);
  const fetchedMethodsRef = useRef<SavedPaymentMethod[]>([]);

  const currencyKey = invoicesList[0]?.currencyKey || 'USD';
  const currencySymbol = toCurrencySymbol(currencyKey) || '$';

  // Calculate totals
  const totalAmount = useMemo(() => {
    return invoicesList.reduce((sum, inv) => {
      const amt = parseFloat(String(inv.paymentAmount ?? 0));
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);
  }, [invoicesList]);

  // Target account identifier
  const targetAccount = useMemo(() => {
    return (
      accountId ||
      accountNumber ||
      initialInvoices[0]?.accountNumber ||
      ''
    ).trim();
  }, [accountId, accountNumber, initialInvoices]);

  // Convert initial payer cards from session or SAP/Salesforce to SavedPaymentMethod format
  const mappedInitialCards: SavedPaymentMethod[] = useMemo(() => {
    if (!initialCards || !Array.isArray(initialCards)) return [];
    return initialCards
      .filter((c: any) => c && (c.paymentCardToken || c.token))
      .map((c: any) => {
        let expMonth: number | undefined;
        let expYear: number | undefined;
        const validTo = c.validTo || c.valid_to;
        if (validTo && typeof validTo === 'string') {
          const parts = validTo.split('/');
          if (parts.length === 2) {
            expMonth = parseInt(parts[0], 10);
            expYear = parseInt(parts[1], 10);
            if (expYear < 100) expYear += 2000;
          }
        }
        return {
          id: c.paymentCardToken || c.token,
          type: 'card',
          card: {
            brand: (c.paymentCardType || c.cardType || 'card').toLowerCase(),
            last4: c.cardLast4Digit || (c.paymentCardToken ? c.paymentCardToken.slice(-4) : '••••'),
            expMonth,
            expYear,
          },
          billingDetails: {
            name: c.paymentCardName || c.name || '',
          },
          isFallback: true,
        };
      });
  }, [initialCards]);

  // Helper to deduplicate cards by both Token/ID and Fingerprint (brand + last4)
  const mergeAndDeduplicateCards = (
    fetched: SavedPaymentMethod[],
    fallbacks: SavedPaymentMethod[]
  ): SavedPaymentMethod[] => {
    const merged: SavedPaymentMethod[] = [];
    const seenIds = new Set<string>();
    const seenFingerprints = new Set<string>();

    const addCard = (pm: SavedPaymentMethod) => {
      if (!pm || !pm.id) return;
      const pmId = pm.id.trim();
      if (seenIds.has(pmId)) return;

      const brand = (pm.card?.brand || '').toLowerCase().trim();
      const last4 = (pm.card?.last4 || '').trim();
      const fp = brand && last4 ? `${brand}-${last4}` : pmId;

      if (seenFingerprints.has(fp)) return;

      seenIds.add(pmId);
      seenFingerprints.add(fp);
      merged.push(pm);
    };

    // 1. Authoritative Stripe payment methods from customerCards API
    for (const m of fetched) {
      addCard(m);
    }

    // 2. Fallback cards from local account only if not already present
    for (const initCard of fallbacks) {
      addCard(initCard);
    }

    return merged;
  };

  // Load customer and saved payment methods — strictly once per targetAccount
  useEffect(() => {
    let isMounted = true;

    if (!targetAccount) {
      setIsLoadingCustomer(false);
      return;
    }

    // Guard: Prevent calling customer-payment-methods multiple times for the same account
    if (lastLoadedAccountRef.current === targetAccount || isLoadingCustomerRef.current) {
      return;
    }

    lastLoadedAccountRef.current = targetAccount;
    isLoadingCustomerRef.current = true;

    const loadCustomerData = async () => {
      setIsLoadingCustomer(true);
      try {
        // 1. Fetch Publishable key if not already cached
        if (!publishableKey) {
          const cfgRes = await fetch('/api/stripe/config');
          if (cfgRes.ok) {
            const cfg = await cfgRes.json();
            if (isMounted) setPublishableKey(cfg.publishableKey);
          }
        }

        // 2. Resolve Stripe Customer & Payment Methods
        const csrfHeaders = await getCsrfHeaders();
        let fetchedMethods: SavedPaymentMethod[] = [];

        try {
          const res = await fetch(
            `/api/stripe/customer-payment-methods/${encodeURIComponent(targetAccount)}`,
            {
              credentials: 'include',
              headers: {
                ...csrfHeaders,
              },
            }
          );
          if (res.ok) {
            const data = await res.json();
            if (isMounted && data) {
              const custObj = typeof data.customer === 'object' ? data.customer : {};
              const resolvedCustomer: CustomerDetails = {
                customerId: custObj?.id || data.customerId || '',
                accountName: data.accountName || accountName,
                accountNumber: data.accountNumber || accountNumber,
                email: data.email || userEmail || custObj?.email || '',
                phone: data.phone || custObj?.phone || '',
                billingStreet: data.billingStreet || custObj?.address?.line1 || '',
                billingCity: data.billingCity || custObj?.address?.city || '',
                billingState: data.billingState || custObj?.address?.state || '',
                billingPostalCode: data.billingPostalCode || custObj?.address?.postal_code || '',
                billingCountry: data.billingCountry || custObj?.address?.country || 'US',
              };
              setCustomer(resolvedCustomer);

              if (Array.isArray(data.paymentMethods)) {
                fetchedMethods = data.paymentMethods;
                fetchedMethodsRef.current = data.paymentMethods;
              }
            }
          }
        } catch (fetchErr) {
          console.warn('Stripe customer-payment-methods call failed, will use local cards if present:', fetchErr);
        }

        if (isMounted) {
          const merged = mergeAndDeduplicateCards(fetchedMethods, mappedInitialCards);
          setSavedCards(merged);

          if (merged.length > 0) {
            setSelectedSavedCardId((prev) => (merged.some((m) => m.id === prev) ? prev : merged[0].id));
            setPaymentMode('existing');
          } else {
            setPaymentMode('new');
          }
        }
      } catch (err: any) {
        console.warn('Could not load customer/payment methods:', err);
        if (isMounted && mappedInitialCards.length > 0) {
          const merged = mergeAndDeduplicateCards([], mappedInitialCards);
          setSavedCards(merged);
          if (merged.length > 0) {
            setSelectedSavedCardId(merged[0].id);
            setPaymentMode('existing');
          }
        }
      } finally {
        isLoadingCustomerRef.current = false;
        if (isMounted) setIsLoadingCustomer(false);
      }
    };

    loadCustomerData();
    return () => {
      isMounted = false;
    };
  }, [targetAccount, accountName, userEmail]);

  // Initialize Stripe Payment Element when 'new' mode is chosen
  useEffect(() => {
    if (paymentMode !== 'new' || !publishableKey || !paymentElementContainerRef.current) {
      return;
    }

    let isCancelled = false;

    const initStripeElement = async () => {
      setPaymentElementLoading(true);
      setPaymentElementReady(false);
      setErrorMessage(null);

      try {
        const stripe = await getStripe(publishableKey);
        if (!stripe || isCancelled) return;
        stripeInstanceRef.current = stripe;

        // Cleanup old element
        if (paymentElementInstanceRef.current) {
          try {
            paymentElementInstanceRef.current.destroy();
          } catch (ignored) {}
          paymentElementInstanceRef.current = null;
        }

        const cents = Math.max(1, Math.round(totalAmount * 100));
        const elements = stripe.elements({
          mode: 'payment',
          amount: cents,
          currency: currencyKey.toLowerCase(),
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#0176d3',
              borderRadius: '8px',
              fontFamily: 'Inter, -apple-system, Roboto, sans-serif',
            },
          },
        });
        elementsInstanceRef.current = elements;

        if (paymentElementContainerRef.current && !isCancelled) {
          paymentElementContainerRef.current.innerHTML = '';
          const pe = elements.create('payment');
          paymentElementInstanceRef.current = pe;
          pe.mount(paymentElementContainerRef.current);
          pe.on('ready', () => {
            if (!isCancelled) {
              setPaymentElementReady(true);
              setPaymentElementLoading(false);
            }
          });
        }
      } catch (e: any) {
        if (!isCancelled) {
          console.error('Stripe Element Init Error:', e);
          setErrorMessage(e.message || 'Failed to initialize payment form.');
          setPaymentElementLoading(false);
        }
      }
    };

    initStripeElement();

    return () => {
      isCancelled = true;
      if (paymentElementInstanceRef.current) {
        try {
          paymentElementInstanceRef.current.destroy();
        } catch (ignored) {}
        paymentElementInstanceRef.current = null;
      }
    };
  }, [paymentMode, publishableKey, totalAmount, currencyKey]);

  // Invoice handlers
  const handleAmountChange = (index: number, val: string) => {
    const num = parseFloat(val);
    setInvoicesList((prev) =>
      prev.map((inv, idx) => (idx === index ? { ...inv, paymentAmount: isNaN(num) ? 0 : num } : inv))
    );
  };

  const handleRemoveInvoice = (index: number) => {
    setInvoicesList((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Pay execution
  const handlePay = async () => {
    if (invoicesList.length === 0 || totalAmount <= 0) {
      setErrorMessage('Please select at least one invoice with a positive payment amount.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const invoiceNumbers = invoicesList
      .map((inv) => inv.billingDocumentNumber || inv.referenceNumber)
      .filter(Boolean)
      .join(', ');

    const csrfHeaders = await getCsrfHeaders();

    try {
      if (paymentMode === 'existing') {
        if (!selectedSavedCardId) {
          throw new Error('Please select a saved payment method.');
        }

        // Call backend to create & confirm PaymentIntent using saved card
        const response = await fetch('/api/stripe/payment-intent', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...csrfHeaders,
          },
          body: JSON.stringify({
            amount: totalAmount,
            currencyCode: currencyKey,
            customerId: customer.customerId || undefined,
            paymentMethodId: selectedSavedCardId,
            accountId: accountId || accountNumber,
            invoiceNumber: invoiceNumbers,
            customerName: customer.accountName,
            customerEmail: customer.email,
            confirm: true,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || 'Payment failed.');
        }

        const result = await response.json();

        // Check for 3D Secure / requires_action
        if (result.status === 'requires_action' && result.clientSecret) {
          const stripe = await getStripe(publishableKey);
          if (!stripe) throw new Error('Stripe.js is unavailable.');
          const confirmResult = await stripe.confirmCardPayment(result.clientSecret);
          if (confirmResult.error) {
            throw new Error(confirmResult.error.message || '3D Secure authentication failed.');
          }
        } else if (result.status !== 'succeeded') {
          throw new Error(`Payment failed with status: ${result.status}`);
        }

        const receiptData = {
          paymentIntentId: result.paymentIntentId,
          amount: totalAmount,
          currency: currencyKey,
          invoices: invoicesList,
          paymentMethod: 'Saved Card',
          date: new Date().toLocaleString(),
        };

        setSuccessReceipt(receiptData);
        onPaymentSuccess?.(result.paymentIntentId, receiptData);
      } else {
        // New Card Flow with Stripe Elements
        const stripe = stripeInstanceRef.current;
        const elements = elementsInstanceRef.current;
        if (!stripe || !elements) {
          throw new Error('Stripe form is not ready.');
        }

        // 1. Submit Elements
        const { error: submitError } = await elements.submit();
        if (submitError) {
          throw new Error(submitError.message || 'Validation error in payment details.');
        }

        // 2. Create PaymentIntent on Server
        const piRes = await fetch('/api/stripe/payment-intent', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...csrfHeaders,
          },
          body: JSON.stringify({
            amount: totalAmount,
            currencyCode: currencyKey,
            customerId: customer.customerId || undefined,
            accountId: accountId || accountNumber,
            invoiceNumber: invoiceNumbers,
            customerName: customer.accountName,
            customerEmail: customer.email,
            setupFutureUsage: saveCardForFuture,
            confirm: false,
          }),
        });

        if (!piRes.ok) {
          const errData = await piRes.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || 'Failed to initialize payment.');
        }

        const piData = await piRes.json();
        if (!piData.clientSecret) {
          throw new Error('PaymentIntent client secret is missing.');
        }

        // 3. Confirm payment with Stripe.js
        const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
          elements,
          clientSecret: piData.clientSecret,
          redirect: 'if_required',
          confirmParams: {
            payment_method_data: {
              billing_details: {
                name: customer.accountName,
                email: customer.email,
                phone: customer.phone,
                address: {
                  line1: customer.billingStreet || undefined,
                  city: customer.billingCity || undefined,
                  state: customer.billingState || undefined,
                  postal_code: customer.billingPostalCode || undefined,
                  country: customer.billingCountry || 'US',
                },
              },
            },
          },
        });

        if (confirmError) {
          throw new Error(confirmError.message || 'Payment confirmation failed.');
        }

        if (paymentIntent && paymentIntent.status === 'succeeded') {
          // Sync card if saveCardForFuture was selected
          if (saveCardForFuture && customer.customerId && paymentIntent.payment_method) {
            const pmId =
              typeof paymentIntent.payment_method === 'string'
                ? paymentIntent.payment_method
                : paymentIntent.payment_method.id;
            try {
              await fetch('/api/stripe/payment-method', {
                method: 'POST',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                  ...csrfHeaders,
                },
                body: JSON.stringify({
                  paymentMethodId: pmId,
                  customerId: customer.customerId,
                  accountId: accountId || accountNumber,
                  cardholderName: customer.accountName,
                  customerEmail: customer.email,
                  setDefault: true,
                }),
              });
            } catch (syncErr) {
              console.warn('Failed to sync payment method:', syncErr);
            }
          }

          const receiptData = {
            paymentIntentId: paymentIntent.id,
            amount: totalAmount,
            currency: currencyKey,
            invoices: invoicesList,
            paymentMethod: 'New Card (Stripe)',
            date: new Date().toLocaleString(),
          };

          setSuccessReceipt(receiptData);
          onPaymentSuccess?.(paymentIntent.id, receiptData);
        } else {
          throw new Error(`Payment ended with status: ${paymentIntent?.status || 'incomplete'}`);
        }
      }
    } catch (err: any) {
      console.error('Payment Error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred during payment.');
    } finally {
      setIsProcessing(false);
    }
  };

  // If payment succeeded, show confirmation receipt
  if (successReceipt) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
        <Paper
          elevation={2}
          sx={{
            p: 4,
            borderRadius: 3,
            textAlign: 'center',
            border: '1px solid',
            borderColor: 'success.light',
            background: 'linear-gradient(180deg, #f6ffed 0%, #ffffff 100%)',
          }}
        >
          <CheckCircleOutlineIcon color="success" sx={{ fontSize: 72, mb: 2 }} />
          <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: '#237804' }}>
            Payment Successful!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Your transaction has been processed securely via ChronarPay.
          </Typography>

          <Box
            sx={{
              backgroundColor: '#fafafa',
              borderRadius: 2,
              p: 3,
              mb: 4,
              textAlign: 'left',
              border: '1px solid #f0f0f0',
            }}
          >
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  TRANSACTION ID
                </Typography>
                <Typography variant="subtitle2" fontWeight={700}>
                  {successReceipt.paymentIntentId}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  DATE & TIME
                </Typography>
                <Typography variant="subtitle2" fontWeight={700}>
                  {successReceipt.date}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  CUSTOMER
                </Typography>
                <Typography variant="subtitle2" fontWeight={700}>
                  {customer.accountName} ({customer.accountNumber || accountId})
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  AMOUNT PAID
                </Typography>
                <Typography variant="h6" fontWeight={800} color="primary.main">
                  {currencySymbol}
                  {successReceipt.amount.toFixed(2)} {successReceipt.currency}
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Invoices Settled ({successReceipt.invoices.length})
            </Typography>
            <Stack spacing={1}>
              {successReceipt.invoices.map((inv: CheckoutInvoice, idx: number) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 0.5,
                  }}
                >
                  <Typography variant="body2">
                    Invoice #{inv.billingDocumentNumber || inv.referenceNumber}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {currencySymbol}
                    {(inv.paymentAmount ?? 0).toFixed(2)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          <Button
            variant="contained"
            size="large"
            onClick={onBack}
            sx={{ px: 4, py: 1.2, fontWeight: 700, borderRadius: 2 }}
          >
            Back to Invoices
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={onBack} sx={{ mr: 2 }} aria-label="back">
          <ArrowBackIcon />
        </IconButton>
        <div>
          <Typography variant="h5" fontWeight={700}>
            Complete Payment
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Pay invoices securely with Stripe & ChronarPay
          </Typography>
        </div>
      </Box>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left Column: Invoices & Amount Summary */}
        <Grid item xs={12} md={5}>
          <Card elevation={1} sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                Selected Invoices ({invoicesList.length})
              </Typography>

              {invoicesList.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No invoices selected.
                </Typography>
              ) : (
                <Stack spacing={2}>
                  {invoicesList.map((inv, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight={700}>
                          #{inv.billingDocumentNumber || inv.referenceNumber}
                        </Typography>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveInvoice(idx)}
                          title="Remove invoice"
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Due: {inv.dueDate || '-'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Open: {currencySymbol}
                          {(inv.openAmount ?? 0).toFixed(2)}
                        </Typography>
                      </Box>
                      <TextField
                        size="small"
                        type="number"
                        label="Payment Amount"
                        value={inv.paymentAmount}
                        onChange={(e) => handleAmountChange(idx, e.target.value)}
                        fullWidth
                        InputProps={{
                          startAdornment: (
                            <Typography variant="body2" sx={{ mr: 0.5 }}>
                              {currencySymbol}
                            </Typography>
                          ),
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
              )}

              <Divider sx={{ my: 2.5 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Subtotal
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {currencySymbol}
                  {totalAmount.toFixed(2)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight={800}>
                  Total to Pay
                </Typography>
                <Typography variant="h6" fontWeight={800} color="primary.main">
                  {currencySymbol}
                  {totalAmount.toFixed(2)} {currencyKey}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Customer info card */}
          <Card elevation={1} sx={{ borderRadius: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <PersonOutlineIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="subtitle1" fontWeight={700}>
                  Customer Context
                </Typography>
              </Box>
              <Typography variant="body2" fontWeight={600}>
                {customer.accountName || 'Customer Account'}
              </Typography>
              {customer.accountNumber && (
                <Typography variant="caption" color="text.secondary" display="block">
                  Account #: {customer.accountNumber}
                </Typography>
              )}
              {customer.email && (
                <Typography variant="caption" color="text.secondary" display="block">
                  Email: {customer.email}
                </Typography>
              )}
              {customer.customerId && (
                <Chip
                  size="small"
                  label={`Stripe: ${customer.customerId}`}
                  sx={{ mt: 1, fontSize: '0.7rem' }}
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Payment Method Selection & Checkout */}
        <Grid item xs={12} md={7}>
          <Card elevation={1} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                Payment Method
              </Typography>

              {isLoadingCustomer ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={32} />
                </Box>
              ) : (
                <>
                  {/* Payment Mode Selector: Saved Cards vs New Card */}
                  <RadioGroup
                    row
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as 'existing' | 'new')}
                    sx={{ mb: 3 }}
                  >
                    <FormControlLabel
                      value="existing"
                      control={<Radio />}
                      disabled={savedCards.length === 0}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CreditCardIcon sx={{ mr: 0.5, fontSize: 20 }} />
                          <Typography variant="body2" fontWeight={600}>
                            Saved Cards ({savedCards.length})
                          </Typography>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      value="new"
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <AddCircleOutlineIcon sx={{ mr: 0.5, fontSize: 20 }} />
                          <Typography variant="body2" fontWeight={600}>
                            New Card (Stripe Elements)
                          </Typography>
                        </Box>
                      }
                    />
                  </RadioGroup>

                  {/* MODE 1: Saved Payment Methods */}
                  {paymentMode === 'existing' && (
                    <Stack spacing={2} sx={{ mb: 3 }}>
                      {savedCards.map((pm) => {
                        const isSelected = selectedSavedCardId === pm.id;
                        return (
                          <Paper
                            key={pm.id}
                            variant="outlined"
                            onClick={() => setSelectedSavedCardId(pm.id)}
                            sx={{
                              p: 2,
                              borderRadius: 2,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              borderColor: isSelected ? 'primary.main' : 'divider',
                              backgroundColor: isSelected ? '#f0f7ff' : '#ffffff',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                borderColor: 'primary.main',
                              },
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Radio checked={isSelected} sx={{ mr: 1 }} />
                              <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
                                <PaymentLogo icon={pm.card?.brand} />
                              </Box>
                              <div>
                                <Typography variant="subtitle2" fontWeight={700}>
                                  {(pm.card?.brand || 'Card').toUpperCase()} •••• {pm.card?.last4 || '••••'}
                                </Typography>
                                {(() => {
                                  const expM = pm.card?.expMonth ?? pm.card?.exp_month;
                                  const expY = pm.card?.expYear ?? pm.card?.exp_year;
                                  if (expM && expY) {
                                    return (
                                      <Typography variant="caption" color="text.secondary">
                                        Expires {String(expM).padStart(2, '0')}/{expY}
                                      </Typography>
                                    );
                                  }
                                  return (
                                    <Typography variant="caption" color="text.secondary">
                                      Saved payment card
                                    </Typography>
                                  );
                                })()}
                              </div>
                            </Box>
                          </Paper>
                        );
                      })}
                    </Stack>
                  )}

                  {/* MODE 2: New Card via Stripe Elements */}
                  {paymentMode === 'new' && (
                    <Box sx={{ mb: 3 }}>
                      {paymentElementLoading && (
                        <Box sx={{ display: 'flex', alignItems: 'center', py: 2 }}>
                          <CircularProgress size={20} sx={{ mr: 1.5 }} />
                          <Typography variant="body2" color="text.secondary">
                            Loading secure payment form...
                          </Typography>
                        </Box>
                      )}
                      <Box
                        ref={paymentElementContainerRef}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          border: '1px solid #e2e8f0',
                          backgroundColor: '#fafafa',
                          minHeight: 200,
                        }}
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={saveCardForFuture}
                            onChange={(e) => setSaveCardForFuture(e.target.checked)}
                            color="primary"
                          />
                        }
                        label={
                          <Typography variant="body2" color="text.secondary">
                            Save this card on file for future payments
                          </Typography>
                        }
                        sx={{ mt: 1.5 }}
                      />
                    </Box>
                  )}

                  {/* Pay Button */}
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={
                      isProcessing ||
                      totalAmount <= 0 ||
                      (paymentMode === 'new' && (!paymentElementReady || paymentElementLoading)) ||
                      (paymentMode === 'existing' && !selectedSavedCardId)
                    }
                    onClick={handlePay}
                    sx={{
                      py: 1.6,
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      borderRadius: 2,
                    }}
                  >
                    {isProcessing ? (
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <CircularProgress size={20} color="inherit" />
                        <span>Processing Payment...</span>
                      </Stack>
                    ) : (
                      `Pay ${currencySymbol}${totalAmount.toFixed(2)} ${currencyKey}`
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
