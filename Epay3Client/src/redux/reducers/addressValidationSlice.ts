import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { RootState } from '../EpayStore'; // Adjust this import based on your file structure

interface AddressValidationState {
  addressInputValue: string;
  cityInputValue: string;
  stateInputValue: string;
  zipcodeInputValue: string;
  addressValidationErrorMessage: string;
  addressValidationIsEnabled: string;
  addressValidationIsExpanded: boolean;
  addressValidationIsComplete: boolean;
  addressValidationIsEditable: boolean;
  paymentMethodIsExpanded: boolean;
  paymentMethodIsComplete: boolean;
  paymentMethodIsEditable: boolean;
  paymentMethodIsCreditCard: boolean;
}

// Initial state
export const addressValidationInitialState: AddressValidationState = {
  addressInputValue: '',
  cityInputValue: '',
  stateInputValue: 'select',
  zipcodeInputValue: '',
  addressValidationErrorMessage: '',
  addressValidationIsEnabled: '',
  addressValidationIsExpanded: false,
  addressValidationIsComplete: false,
  addressValidationIsEditable: false,
  paymentMethodIsExpanded: true,
  paymentMethodIsComplete: false,
  paymentMethodIsEditable: false,
  paymentMethodIsCreditCard: false,
};

export const addressValidationSlice = createSlice({
  name: 'addressState',
  initialState: addressValidationInitialState,
  reducers: {
    setAddressInputValue: (state, action: PayloadAction<string>) => {
      state.addressInputValue = action.payload;
      state.addressValidationErrorMessage = '';
    },
    setCityInputValue: (state, action: PayloadAction<string>) => {
      state.cityInputValue = action.payload;
      state.addressValidationErrorMessage = '';
    },
    setStateInputValue: (state, action: PayloadAction<string>) => {
      state.stateInputValue = action.payload;
      state.addressValidationErrorMessage = '';
    },
    setZipcodeInputValue: (state, action: PayloadAction<string>) => {
      state.zipcodeInputValue = action.payload;
      state.addressValidationErrorMessage = '';
    },
    setAddressValidationErrorMessage: (
      state,
      action: PayloadAction<string>,
    ) => {
      state.addressValidationErrorMessage = action.payload;
    },
    setAddressValidationIsEnabled: (state, action: PayloadAction<string>) => {
      state.addressValidationIsEnabled = action.payload;
    },
    setAddressValidationIsExpanded: (state, action: PayloadAction<boolean>) => {
      state.addressValidationIsExpanded = action.payload;
    },
    setAddressValidationIsComplete: (state, action: PayloadAction<boolean>) => {
      state.addressValidationIsComplete = action.payload;
    },
    setAddressValidationIsEditable: (state, action: PayloadAction<boolean>) => {
      state.addressValidationIsEditable = action.payload;
    },
    setPaymentMethodIsExpanded: (state, action: PayloadAction<boolean>) => {
      state.paymentMethodIsExpanded = action.payload;
    },
    setPaymentMethodIsComplete: (state, action: PayloadAction<boolean>) => {
      state.paymentMethodIsComplete = action.payload;
    },
    setPaymentMethodIsEditable: (state, action: PayloadAction<boolean>) => {
      state.paymentMethodIsEditable = action.payload;
    },
    setPaymentMethodIsCreditCard: (state, action: PayloadAction<boolean>) => {
      state.paymentMethodIsCreditCard = action.payload;
    },
    resetAddressConfirmationState: () => {
      return { ...addressValidationInitialState };
    },

    // **New Reducers for Clearing and Editing Address Validation**
    clearAddressValidation: (
      state,
      action: PayloadAction<string | undefined>,
    ) => {
      state.addressInputValue = '';
      state.cityInputValue = '';
      state.stateInputValue = '';
      state.zipcodeInputValue = '';
      state.addressValidationErrorMessage = '';
      state.addressValidationIsExpanded = false;
      state.paymentMethodIsExpanded = action.payload === 'Check' ? false : true;
      state.paymentMethodIsComplete = action.payload === 'Check' ? true : false;
    },

    editAddressValidation: (state, action: PayloadAction<string>) => {
      if (action.payload === 'Payment') {
        state.paymentMethodIsExpanded = true;
        state.paymentMethodIsEditable = false;
        state.paymentMethodIsComplete = false;
        state.addressInputValue = '';
        state.cityInputValue = '';
        state.stateInputValue = '';
        state.zipcodeInputValue = '';
        state.addressValidationErrorMessage = '';
        state.addressValidationIsExpanded = false;
        state.addressValidationIsEditable = false;
        state.addressValidationIsComplete = false;
      } else {
        state.addressValidationErrorMessage = '';
        state.addressValidationIsExpanded = true;
        state.addressValidationIsEditable = false;
        state.addressValidationIsComplete = false;
      }
    },
  },
});

// Export actions
export const {
  setAddressInputValue,
  setCityInputValue,
  setStateInputValue,
  setZipcodeInputValue,
  setAddressValidationErrorMessage,
  setAddressValidationIsEnabled,
  setAddressValidationIsExpanded,
  setAddressValidationIsComplete,
  setAddressValidationIsEditable,
  setPaymentMethodIsExpanded,
  setPaymentMethodIsComplete,
  setPaymentMethodIsEditable,
  setPaymentMethodIsCreditCard,
  resetAddressConfirmationState,
  clearAddressValidation,
  editAddressValidation,
} = addressValidationSlice.actions;

// **Memoized Selector using createSelector**
export const addressSelector = createSelector(
  (state: RootState) => state.address,
  (address) => ({
    addressInputValue: address.addressInputValue,
    cityInputValue: address.cityInputValue,
    stateInputValue: address.stateInputValue,
    zipcodeInputValue: address.zipcodeInputValue,
    addressValidationErrorMessage: address.addressValidationErrorMessage,
    addressValidationIsEnabled: address.addressValidationIsEnabled,
    addressValidationIsExpanded: address.addressValidationIsExpanded,
    addressValidationIsComplete: address.addressValidationIsComplete,
    addressValidationIsEditable: address.addressValidationIsEditable,
    paymentMethodIsExpanded: address.paymentMethodIsExpanded,
    paymentMethodIsComplete: address.paymentMethodIsComplete,
    paymentMethodIsEditable: address.paymentMethodIsEditable,
    paymentMethodIsCreditCard: address.paymentMethodIsCreditCard,
  }),
);

// Export reducer
export default addressValidationSlice.reducer;
