import { PaymentCard, PaymentCardSubmission } from 'types/Payment';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { safeJsonParse } from 'utilities/utilities';

import { RootState } from '../EpayStore';

const SessionPaymentDatum = {
  IsSession: 'session.IsSession',
  Cards: 'session.cards',
} as const;

// Define the types
export interface SessionCard {
  card: { [cardToken: string]: PaymentCard };
}

export interface PayerSessionCards {
  payer: string;
  cards: SessionCard[];
}

export interface SessionCardsState {
  sessionCards: PayerSessionCards[];
  isSession: boolean;
}

export interface SessionCardType {
  paymentCard: PaymentCard;
  payer: string;
}

const saveFlagToSessionStorage = (key: string, value: boolean) => {
  sessionStorage.setItem(key, JSON.stringify(value));
};

const saveToSessionStorage = <T>(key: string, value: T) => {
  sessionStorage.setItem(key, JSON.stringify(value));
};

const sanitizePaymentCard = (
  paymentCard: PaymentCardSubmission,
): PaymentCard => {
  const { cardValidationCode: _ignored, ...sanitizedCard } = paymentCard;
  return sanitizedCard;
};

// Helper function to load from sessionStorage
const loadFromSessionStorage = <T>(key: string, defaultValue: T): T => {
  const storedValue = sessionStorage.getItem(key);
  return safeJsonParse<T>(storedValue, defaultValue);
};

export const sessionCardsSliceInitialState: SessionCardsState = {
  sessionCards: loadFromSessionStorage(
    SessionPaymentDatum.Cards,
    [] as PayerSessionCards[],
  ),
  isSession: loadFromSessionStorage(SessionPaymentDatum.IsSession, false),
};

const sessionCardsSlice = createSlice({
  name: 'sessionCards',
  initialState: sessionCardsSliceInitialState,
  reducers: {
    addSessionCard: (state, action: PayloadAction<SessionCardType>) => {
      const { paymentCard, payer } = action.payload;
      if (payer === '') return;

      // Find the payer's session cards
      let payerSession = state.sessionCards.find((s) => s.payer === payer);

      if (!payerSession) {
        // If the payer doesn't exist, create a new entry
        payerSession = { payer, cards: [] };
        state.sessionCards.push(payerSession);
      }

      // Add the new card to the payer's session cards
      const sanitizedCard = sanitizePaymentCard(paymentCard);
      const existingCardIndex = payerSession.cards.findIndex(
        (sessionCard) => sanitizedCard.paymentCardToken in sessionCard.card,
      );

      if (existingCardIndex !== -1) {
        payerSession.cards[existingCardIndex] = {
          card: { [sanitizedCard.paymentCardToken]: sanitizedCard },
        };
      } else {
        payerSession.cards.push({
          card: { [sanitizedCard.paymentCardToken]: sanitizedCard },
        });
      }
      saveToSessionStorage(SessionPaymentDatum.Cards, state.sessionCards);
    },

    updateSessionCard: (state, action: PayloadAction<SessionCardType>) => {
      const { paymentCard, payer } = action.payload;

      // Find the payer's session cards
      const payerCards = state.sessionCards.find((s) => s.payer === payer);
      if (payerCards) {
        const sanitizedCard = sanitizePaymentCard(paymentCard);
        const updatedCards = payerCards.cards.map((sessionCard) => ({
          ...sessionCard,
          card: {
            ...sessionCard.card,
            [sanitizedCard.paymentCardToken]: sanitizedCard,
          },
        }));

        state.sessionCards = state.sessionCards.map((payerCards) =>
          payerCards.payer === payer
            ? { ...payerCards, cards: updatedCards }
            : payerCards,
        );
        saveToSessionStorage(SessionPaymentDatum.Cards, state.sessionCards);
      }
    },

    deleteSessionCard: (state, action: PayloadAction<SessionCardType>) => {
      const { paymentCard, payer } = action.payload;

      const payerCards = state.sessionCards.find(
        (item) => item.payer === payer,
      );
      if (payerCards) {
        const cardIndex = payerCards.cards.findIndex(
          (card) => paymentCard.paymentCardToken in card.card,
        );
        if (cardIndex !== -1) {
          payerCards.cards.splice(cardIndex, 1);
          saveToSessionStorage(SessionPaymentDatum.Cards, state.sessionCards);
        }
      }
    },

    addIsSession: (state) => {
      state.isSession = true;
      saveFlagToSessionStorage(SessionPaymentDatum.IsSession, true);
    },

    removeIsSession: (state) => {
      state.isSession = false;
      saveFlagToSessionStorage(SessionPaymentDatum.IsSession, false);
    },
  },
});

export const {
  addIsSession,
  removeIsSession,
  addSessionCard,
  updateSessionCard,
  deleteSessionCard,
} = sessionCardsSlice.actions;

export const isSessionSelector = (state: RootState) =>
  state.sessionCards.isSession;

export const sessionCardsSelector = (state: RootState) =>
  state.sessionCards.sessionCards;
export default sessionCardsSlice.reducer;
