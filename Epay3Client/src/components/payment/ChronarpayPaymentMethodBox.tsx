import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AddCardIcon from '@mui/icons-material/AddCard';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import TuneIcon from '@mui/icons-material/Tune';
import { PaymentCard, PaymentMethod } from 'types/Payment';
import PaymentLogo from 'shared/components/PaymentLogo';
import { getCsrfHeaders } from 'utilities/csrf';
import { PaymentMethodModal } from '../cards/PaymentMethodModal';
import { PaymentTypes } from '../../constants/UiOptions';

interface ChronarpayPaymentMethodBoxProps {
  selectedCard: PaymentMethod;
  onSelectCard: (card: PaymentMethod) => void;
  existingMethods: PaymentMethod[];
  payer: string;
  accountId: string;
  accountName?: string;
  userEmail?: string;
  // CVV handling for standard cards
  cvv: string;
  onCvvChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCvvBlur: () => void;
  isCvvError: boolean;
  cvvError: string;
  isCVVAllowed: boolean;
  // Manage methods
  canManagePaymentMethods?: boolean;
  showManagePayments?: boolean;
  onToggleShowManagePayments?: (e: any) => void;
  cards: PaymentCard[];
  allowEchecks?: boolean;
  isAutoPayEnabled?: boolean;
  isAutoPayEnrolled?: boolean;
  onPaymentMethodAdded: (card: PaymentCard) => void;
  // Navigation / Continue / Pay
  startPay: boolean;
  onContinue: () => void;
  onPay?: () => void;
  isProcessing?: boolean;
  amountToPay?: number;
  paymentNote?: string;
}

export default function ChronarpayPaymentMethodBox({
  selectedCard,
  onSelectCard,
  existingMethods,
  payer,
  accountId,
  accountName = '',
  userEmail = '',
  cvv,
  onCvvChange,
  onCvvBlur,
  isCvvError,
  cvvError,
  isCVVAllowed,
  cards,
  allowEchecks = true,
  onPaymentMethodAdded,
  startPay,
  onContinue,
  onPay,
  isProcessing = false,
  amountToPay,
  paymentNote,
}: ChronarpayPaymentMethodBoxProps) {
  const [activeTab, setActiveTab] = useState<'cards' | 'echecks'>('cards');
  const [stripeMethods, setStripeMethods] = useState<PaymentMethod[]>([]);
  const [isLoadingStripeCards, setIsLoadingStripeCards] = useState<boolean>(false);

  // Modal for Add Card / Add eCheck
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalType, setModalType] = useState<'card' | 'check'>('card');

  // Options menu for 3 dots
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuTargetMethod, setMenuTargetMethod] = useState<PaymentMethod | null>(null);

  // 1. Fetch Stripe Customer Cards & Bank Accounts per account
  useEffect(() => {
    const targetAccount = (accountId || payer || '').trim();
    if (!targetAccount) return;

    let isCancelled = false;
    const abortController = new AbortController();

    const loadStripePaymentMethods = async () => {
      setIsLoadingStripeCards(true);
      try {
        const csrfHeaders = await getCsrfHeaders();
        const res = await fetch(
          `/api/stripe/customer-payment-methods/${encodeURIComponent(targetAccount)}`,
          {
            signal: abortController.signal,
            credentials: 'include',
            headers: {
              ...csrfHeaders,
            },
          }
        );

        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data && Array.isArray(data.paymentMethods)) {
            const mapped: PaymentMethod[] = data.paymentMethods.map((pm: any) => {
              const isBank =
                pm.type === 'us_bank_account' ||
                Boolean(pm.us_bank_account) ||
                pm.cardType === 'EC' ||
                pm.cardType === 'CHECK';

              if (isBank) {
                const last4 =
                  pm.us_bank_account?.last4 ||
                  pm.last_four ||
                  pm.last4 ||
                  (pm.id ? pm.id.slice(-4) : '••••');
                const bankName =
                  pm.us_bank_account?.bank_name ||
                  pm.billingDetails?.name ||
                  pm.billing_details?.name ||
                  'Bank Account';

                return {
                  name: pm.billingDetails?.name || pm.billing_details?.name || bankName,
                  dropDownDisplayName: `eCheck **** ${last4} - ${bankName}`,
                  key: pm.id,
                  cardType: PaymentTypes.EC,
                  default: false,
                  token: pm.id,
                  isSession: true,
                  cardLast4Digit: last4,
                };
              }

              const expM = pm.card?.expMonth ?? pm.card?.exp_month;
              const expY = pm.card?.expYear ?? pm.card?.exp_year;
              const brand = (pm.card?.brand || pm.cardType || 'Card').toUpperCase();
              const last4 = pm.card?.last4 || pm.last_four || '';
              const cardName =
                pm.billingDetails?.name ||
                pm.billing_details?.name ||
                accountName ||
                `${brand} Card`;

              return {
                name: cardName,
                dropDownDisplayName: `${brand} **** ${last4} - ${cardName}`,
                key: pm.id,
                cardType: brand,
                default: false,
                token: pm.id,
                validTo: expM && expY ? `${String(expM).padStart(2, '0')}/${expY}` : undefined,
                isSession: true,
                cardLast4Digit: last4,
              };
            });
            setStripeMethods(mapped);
          }
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.warn('Could not load Stripe customer payment methods:', err);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingStripeCards(false);
        }
      }
    };

    loadStripePaymentMethods();

    return () => {
      isCancelled = true;
      abortController.abort();
    };
  }, [accountId, payer, accountName]);

  // 2. Merge all payment methods without duplicates
  const allAvailableMethods = useMemo(() => {
    const list: PaymentMethod[] = [];
    const seenIds = new Set<string>();
    const seenFingerprints = new Set<string>();

    const addMethod = (m: PaymentMethod) => {
      if (!m) return;
      const id = (m.token || m.key || '').trim();
      if (!id || id === '-----' || id === 'dummy') return;
      if (seenIds.has(id)) return;

      const brand = (m.cardType || '').toLowerCase().trim();
      const last4 = (m.cardLast4Digit || '').trim();
      const fp = brand && last4 ? `${brand}-${last4}` : id;

      if (seenFingerprints.has(fp)) return;

      seenIds.add(id);
      seenFingerprints.add(fp);

      const displayName =
        m.dropDownDisplayName ||
        `${(m.cardType || 'CARD').toUpperCase()} **** ${m.cardLast4Digit || (m.token ? m.token.slice(-4) : '')} - ${m.name || 'Account'}`;

      list.push({
        ...m,
        dropDownDisplayName: displayName,
        isSession: true,
      });
    };

    // Stripe methods first
    for (const m of stripeMethods) {
      addMethod(m);
    }

    // Existing session / account cards (e.g. from Redux/SAP)
    for (const m of existingMethods) {
      addMethod(m);
    }

    // Direct Redux payment cards
    if (Array.isArray(cards)) {
      for (const c of cards) {
        const isEC = c.paymentCardType === PaymentTypes.EC || c.paymentCardType === 'EC';
        const brand = isEC ? PaymentTypes.EC : (c.paymentCardType || 'Card').toUpperCase();
        addMethod({
          name: c.paymentCardName || (isEC ? 'Bank Account' : `${brand} Card`),
          dropDownDisplayName: isEC
            ? `eCheck **** ${c.cardLast4Digit} - ${c.paymentCardName || 'Bank Account'}`
            : `${brand} **** ${c.cardLast4Digit} - ${c.paymentCardName || 'Card'}`,
          key: c.paymentCardToken,
          cardType: brand,
          default: c.isDefault || false,
          token: c.paymentCardToken,
          validTo: c.validTo,
          isSession: Boolean(c.isSession),
          cardLast4Digit: c.cardLast4Digit,
        });
      }
    }

    return list;
  }, [stripeMethods, existingMethods, cards]);

  // Separate into cards and eChecks
  const cardsList = useMemo(() => {
    return allAvailableMethods.filter(
      (m) => m.cardType !== PaymentTypes.EC && m.cardType !== 'EC'
    );
  }, [allAvailableMethods]);

  const echecksList = useMemo(() => {
    return allAvailableMethods.filter(
      (m) => m.cardType === PaymentTypes.EC || m.cardType === 'EC'
    );
  }, [allAvailableMethods]);

  // Auto-select first available method if none selected or if selected is dummy
  useEffect(() => {
    if (allAvailableMethods.length > 0) {
      const isSelectedInList = allAvailableMethods.some(
        (m) =>
          (m.token && m.token === selectedCard?.token) ||
          (m.key && m.key === selectedCard?.key)
      );
      if (!isSelectedInList || !selectedCard?.token || selectedCard?.token === '-----') {
        onSelectCard(allAvailableMethods[0]);
      }
    }
  }, [allAvailableMethods, selectedCard, onSelectCard]);

  // Sync active tab based on selected method type
  useEffect(() => {
    if (selectedCard?.cardType === PaymentTypes.EC || selectedCard?.cardType === 'EC') {
      setActiveTab('echecks');
    }
  }, [selectedCard?.cardType]);

  const isCardSelected = useCallback(
    (method: PaymentMethod) => {
      if (!selectedCard) return false;
      return Boolean(
        (method.token && method.token === selectedCard.token) ||
        (method.key && method.key === selectedCard.key)
      );
    },
    [selectedCard]
  );

  const selectedDropdownValue = useMemo(() => {
    const found = allAvailableMethods.find(
      (m) =>
        (m.token && m.token === selectedCard?.token) ||
        (m.key && m.key === selectedCard?.key)
    );
    return found?.token || found?.key || selectedCard?.token || selectedCard?.key || '';
  }, [allAvailableMethods, selectedCard]);

  const handleDropdownChange = (e: SelectChangeEvent<string>) => {
    const value = e.target.value;
    const match = allAvailableMethods.find(
      (m) => m.token === value || m.key === value
    );
    if (match) {
      onSelectCard(match);
      if (match.cardType === PaymentTypes.EC || match.cardType === 'EC') {
        setActiveTab('echecks');
      } else {
        setActiveTab('cards');
      }
    }
  };

  const handleOpenAddModal = (type: 'card' | 'check') => {
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleMethodAdded = (newCard: PaymentCard) => {
    setIsModalOpen(false);
    onPaymentMethodAdded(newCard);

    const isEC = newCard.paymentCardType === PaymentTypes.EC || newCard.paymentCardType === 'EC';
    const brand = isEC ? PaymentTypes.EC : (newCard.paymentCardType || 'Card').toUpperCase();
    const newMethod: PaymentMethod = {
      name: newCard.paymentCardName,
      dropDownDisplayName: isEC
        ? `eCheck **** ${newCard.cardLast4Digit} - ${newCard.paymentCardName}`
        : `${brand} **** ${newCard.cardLast4Digit} - ${newCard.paymentCardName}`,
      key: newCard.paymentCardToken,
      cardType: brand,
      default: true,
      token: newCard.paymentCardToken,
      validTo: newCard.validTo,
      isSession: true,
      cardLast4Digit: newCard.cardLast4Digit,
    };

    setStripeMethods((prev) => [newMethod, ...prev]);
    onSelectCard(newMethod);
    setActiveTab(isEC ? 'echecks' : 'cards');
  };

  const handleOpenMenu = (e: React.MouseEvent<HTMLElement>, method: PaymentMethod) => {
    e.stopPropagation();
    setMenuAnchorEl(e.currentTarget);
    setMenuTargetMethod(method);
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
    setMenuTargetMethod(null);
  };

  const handleSetDefault = () => {
    if (menuTargetMethod) {
      onSelectCard(menuTargetMethod);
    }
    handleCloseMenu();
  };

  const handleDeleteMethod = () => {
    if (menuTargetMethod) {
      setStripeMethods((prev) =>
        prev.filter((m) => m.token !== menuTargetMethod.token && m.key !== menuTargetMethod.key)
      );
      if (isCardSelected(menuTargetMethod)) {
        const remaining = allAvailableMethods.filter(
          (m) => m.token !== menuTargetMethod.token && m.key !== menuTargetMethod.key
        );
        if (remaining.length > 0) {
          onSelectCard(remaining[0]);
        }
      }
    }
    handleCloseMenu();
  };

  const isSelectedMethodCard =
    selectedCard?.cardType &&
    selectedCard.cardType !== PaymentTypes.EC &&
    selectedCard.cardType !== 'EC';

  return (
    <Box id="payment-content" sx={{ width: '100%' }}>
      {/* 1. Header */}
      <Typography
        variant="h6"
        sx={{
          fontSize: '1rem',
          fontWeight: 700,
          color: '#1e293b',
          mb: 1.5,
        }}
      >
        Payment Method
      </Typography>

      {/* 2. Top Selected Payment Method Dropdown */}
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <Select
          value={selectedDropdownValue}
          onChange={handleDropdownChange}
          IconComponent={KeyboardArrowDownIcon}
          displayEmpty
          renderValue={(value) => {
            const found = allAvailableMethods.find(
              (m) => m.token === value || m.key === value
            );
            if (found) {
              const brand = (found.cardType || 'CARD').toUpperCase();
              const last4 = found.cardLast4Digit || (found.token ? found.token.slice(-4) : '');
              const name = found.name || 'Account';
              if (found.cardType === PaymentTypes.EC || found.cardType === 'EC') {
                return `eCheck **** ${last4} - ${name}`;
              }
              return `${brand} **** ${last4} - ${name}`;
            }
            if (selectedCard?.dropDownDisplayName) {
              return selectedCard.dropDownDisplayName;
            }
            return 'Select Payment Method';
          }}
          sx={{
            borderRadius: '6px',
            backgroundColor: '#ffffff',
            fontSize: '0.875rem',
            fontWeight: 500,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#e2e8f0',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#6b11ff',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#6b11ff',
            },
          }}
        >
          {allAvailableMethods.map((m) => {
            const isEC = m.cardType === PaymentTypes.EC || m.cardType === 'EC';
            const brand = (m.cardType || 'CARD').toUpperCase();
            const last4 = m.cardLast4Digit || (m.token ? m.token.slice(-4) : '');
            const name = m.name || (isEC ? 'Bank Account' : `${brand} Card`);

            return (
              <MenuItem
                key={m.token || m.key}
                value={m.token || m.key}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  py: 1,
                  fontSize: '0.875rem',
                }}
              >
                <Box sx={{ width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isEC ? (
                    <AccountBalanceIcon sx={{ color: '#0284c7', fontSize: 20 }} />
                  ) : (
                    <PaymentLogo icon={m.cardType} />
                  )}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {isEC ? `eCheck **** ${last4} - ${name}` : `${brand} **** ${last4} - ${name}`}
                </Typography>
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>

      {/* 3. CVV Input (Only for Cards) */}
      {isCVVAllowed && isSelectedMethodCard && (
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              fontWeight: 600,
              color: '#475569',
              fontSize: '0.8rem',
              mb: 0.5,
            }}
          >
            CVV
          </Typography>
          <TextField
            size="small"
            fullWidth
            required
            value={cvv}
            error={isCvvError}
            helperText={cvvError}
            placeholder={selectedCard?.cardType?.toLowerCase() === 'amex' ? 'XXXX' : 'XXX'}
            onChange={onCvvChange}
            onBlur={onCvvBlur}
            inputProps={{ maxLength: 4 }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                fontSize: '0.875rem',
                '& fieldset': {
                  borderColor: '#e2e8f0',
                },
                '&:hover fieldset': {
                  borderColor: '#6b11ff',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#6b11ff',
                },
              },
            }}
          />
        </Box>
      )}

      {/* 4. Manage Payment Methods Section */}
      <Box sx={{ mt: 1, mb: 1.5 }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            cursor: 'pointer',
            color: '#6b11ff',
            mb: 1.5,
            userSelect: 'none',
            '&:hover': { opacity: 0.85 },
          }}
        >
          <TuneIcon sx={{ fontSize: 18, mr: 0.75 }} />
          <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
            Manage Payment Methods
          </Typography>
        </Box>

        {/* 5. Tabs: My Cards / My eChecks */}
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{
            minHeight: 36,
            borderBottom: 1,
            borderColor: '#e2e8f0',
            mb: 1.5,
            '& .MuiTab-root': {
              minHeight: 36,
              py: 0.75,
              px: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              color: '#64748b',
              '&.Mui-selected': {
                color: '#6b11ff',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#6b11ff',
              height: 2.5,
            },
          }}
        >
          <Tab label="My Cards" value="cards" />
          {allowEchecks && <Tab label="My eChecks" value="echecks" />}
        </Tabs>

        {/* Loading indicator */}
        {isLoadingStripeCards && allAvailableMethods.length === 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', py: 2 }}>
            <CircularProgress size={16} sx={{ mr: 1, color: '#6b11ff' }} />
            <Typography variant="caption" color="text.secondary">
              Loading payment methods...
            </Typography>
          </Box>
        )}

        {/* Tab 1: My Cards */}
        {activeTab === 'cards' && (
          <Box>
            {cardsList.length === 0 && !isLoadingStripeCards ? (
              <Box sx={{ py: 1.5, textAlign: 'center', color: '#64748b' }}>
                <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                  No saved credit cards.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {cardsList.map((card) => {
                  const isSelected = isCardSelected(card);
                  return (
                    <Paper
                      key={card.token || card.key}
                      variant="outlined"
                      onClick={() => onSelectCard(card)}
                      sx={{
                        p: 1.2,
                        borderRadius: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        borderColor: isSelected ? '#6b11ff' : '#e2e8f0',
                        backgroundColor: isSelected ? '#faf7ff' : '#ffffff',
                        boxShadow: isSelected ? '0 0 0 1px #6b11ff' : 'none',
                        transition: 'all 0.15s ease-in-out',
                        '&:hover': {
                          borderColor: '#6b11ff',
                          backgroundColor: isSelected ? '#faf7ff' : '#fcfcfd',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                        <Box
                          sx={{
                            width: 42,
                            height: 28,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <PaymentLogo icon={card.cardType} />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: '#1e293b',
                              fontSize: '0.85rem',
                              lineHeight: 1.2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {card.name || card.cardType}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: '#64748b',
                              fontSize: '0.8rem',
                              display: 'block',
                              mt: 0.25,
                            }}
                          >
                            **** {card.cardLast4Digit || (card.token ? card.token.slice(-4) : '')}
                          </Typography>
                        </Box>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => handleOpenMenu(e, card)}
                        sx={{ color: '#94a3b8', '&:hover': { color: '#475569' } }}
                      >
                        <MoreHorizIcon fontSize="small" />
                      </IconButton>
                    </Paper>
                  );
                })}
              </Box>
            )}

            {/* Add Card Link */}
            <Box
              onClick={() => handleOpenAddModal('card')}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                cursor: 'pointer',
                color: '#6b11ff',
                mt: 1.5,
                userSelect: 'none',
                '&:hover': { opacity: 0.8 },
              }}
            >
              <AddCardIcon sx={{ fontSize: 18, mr: 0.75 }} />
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                Add Card
              </Typography>
            </Box>
          </Box>
        )}

        {/* Tab 2: My eChecks */}
        {activeTab === 'echecks' && (
          <Box>
            {echecksList.length === 0 && !isLoadingStripeCards ? (
              <Box sx={{ py: 1.5, textAlign: 'center', color: '#64748b' }}>
                <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                  No saved bank accounts.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {echecksList.map((check) => {
                  const isSelected = isCardSelected(check);
                  return (
                    <Paper
                      key={check.token || check.key}
                      variant="outlined"
                      onClick={() => onSelectCard(check)}
                      sx={{
                        p: 1.2,
                        borderRadius: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        borderColor: isSelected ? '#6b11ff' : '#e2e8f0',
                        backgroundColor: isSelected ? '#faf7ff' : '#ffffff',
                        boxShadow: isSelected ? '0 0 0 1px #6b11ff' : 'none',
                        transition: 'all 0.15s ease-in-out',
                        '&:hover': {
                          borderColor: '#6b11ff',
                          backgroundColor: isSelected ? '#faf7ff' : '#fcfcfd',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                        <Box
                          sx={{
                            width: 42,
                            height: 28,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <AccountBalanceIcon sx={{ color: '#0284c7', fontSize: 24 }} />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: '#1e293b',
                              fontSize: '0.85rem',
                              lineHeight: 1.2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {check.name || 'Bank Account'}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: '#64748b',
                              fontSize: '0.8rem',
                              display: 'block',
                              mt: 0.25,
                            }}
                          >
                            **** {check.cardLast4Digit || (check.token ? check.token.slice(-4) : '')}
                          </Typography>
                        </Box>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => handleOpenMenu(e, check)}
                        sx={{ color: '#94a3b8', '&:hover': { color: '#475569' } }}
                      >
                        <MoreHorizIcon fontSize="small" />
                      </IconButton>
                    </Paper>
                  );
                })}
              </Box>
            )}

            {/* Add Bank Account Link */}
            <Box
              onClick={() => handleOpenAddModal('check')}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                cursor: 'pointer',
                color: '#6b11ff',
                mt: 1.5,
                userSelect: 'none',
                '&:hover': { opacity: 0.8 },
              }}
            >
              <AddCircleOutlineIcon sx={{ fontSize: 18, mr: 0.75 }} />
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                Add Bank Account
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* Payment Note (Limits) */}
      {paymentNote && paymentNote.trim() !== '' && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
          {paymentNote}
        </Typography>
      )}

      {/* 6. Continue / Pay Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button
          variant="contained"
          size="medium"
          onClick={() => {
            onContinue();
            if (onPay) {
              onPay();
            }
          }}
          disabled={
            isProcessing ||
            Boolean(
              isSelectedMethodCard &&
              isCVVAllowed &&
              (!cvv || isCvvError)
            )
          }
          sx={{
            backgroundColor: '#6b11ff',
            '&:hover': { backgroundColor: '#5600e8' },
            px: 3.5,
            py: 1,
            fontWeight: 700,
            borderRadius: 2,
            textTransform: 'none',
            boxShadow: '0 2px 8px rgba(107, 17, 255, 0.25)',
          }}
        >
          {isProcessing ? (
            <CircularProgress size={20} sx={{ color: '#fff' }} />
          ) : (
            'Continue'
          )}
        </Button>
      </Box>

      {/* Options Menu for Three Dots */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleCloseMenu}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleSetDefault} sx={{ fontSize: '0.85rem' }}>
          Select as Active
        </MenuItem>
        <MenuItem onClick={handleDeleteMethod} sx={{ fontSize: '0.85rem', color: '#ef4444' }}>
          Remove
        </MenuItem>
      </Menu>

      {/* Add Payment Method Modal */}
      <PaymentMethodModal
        open={isModalOpen}
        paymentType={modalType}
        handleClose={() => setIsModalOpen(false)}
        onSuccess={handleMethodAdded}
      />
    </Box>
  );
}
