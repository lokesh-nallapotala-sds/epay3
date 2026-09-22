import { KeyboardEvent, useEffect, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { usStates } from 'constants/UiOptions';
import EpayAccordion from 'shared/components/EpayAccordion';
import {
  Autocomplete,
  Box,
  Button,
  Grid,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import {
  addressSelector,
  setAddressInputValue,
  setCityInputValue,
  setStateInputValue,
  setZipcodeInputValue,
} from 'redux/reducers';
import { useIntl } from 'react-intl';
import { useTheme } from '@mui/material/styles';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';

export interface AddressConfirmationProps {
  editAddressValidation: (sectionType: string) => void;
  handleAddressValidation: () => void;
  clearAddressValidation: (paymentType?: string) => void;
}

export default function AddressValidation({
  editAddressValidation,
  handleAddressValidation,
  clearAddressValidation,
}: AddressConfirmationProps) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const intl = useIntl();
  const f = (id) => intl.formatMessage({ id: id });
  const {
    addressInputValue,
    cityInputValue,
    stateInputValue,
    zipcodeInputValue,
    addressValidationErrorMessage,
    addressValidationIsExpanded,
    addressValidationIsComplete,
    addressValidationIsEditable,
  } = useSelector(addressSelector);

  const [errors, setErrors] = useState<Record<string, string | false>>({
    addressInputValue: false,
    cityInputValue: false,
    stateInputValue: false,
    zipcodeInputValue: false,
  });

  const [inputValue, setInputValue] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);

  const validateField = (name: string, value: string) => {
    let errorMsg: string | false = false;
    if (!value.trim()) {
      errorMsg = 'This field is required.';
    } else if (name === 'zipcodeInputValue' && !/^\d{5}$/.test(value)) {
      errorMsg = 'Enter a valid 5-digit ZIP code.';
    }
    setErrors((prev) => ({ ...prev, [name]: errorMsg }));
  };

  useEffect(() => {
    setIsFormValid(
      Object.values(errors).every((error) => error === false) &&
        Boolean(addressInputValue.trim()) &&
        Boolean(cityInputValue.trim()) &&
        Boolean(stateInputValue.trim()) &&
        Boolean(zipcodeInputValue.trim()),
    );
  }, [
    errors,
    addressInputValue,
    cityInputValue,
    stateInputValue,
    zipcodeInputValue,
  ]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === 'Tab') {
      const exactMatch = usStates.find(
        (state) =>
          state.name.toLowerCase() === inputValue.toLowerCase() ||
          state.code.toLowerCase() === inputValue.toLowerCase(),
      );

      if (exactMatch) {
        dispatch(setStateInputValue(exactMatch.code));
        setInputValue(exactMatch.name);
        event.preventDefault();

        setTimeout(() => {
          document.getElementById('zipcode-input')?.focus();
        }, 100);
      }
    }
  };

  const handleBlur = () => {
    const exactMatch = usStates.find(
      (state) =>
        state.name.toLowerCase() === inputValue.toLowerCase() ||
        state.code.toLowerCase() === inputValue.toLowerCase(),
    );

    if (exactMatch) {
      dispatch(setStateInputValue(exactMatch.code));
      setInputValue(exactMatch.name);
    }
  };

  return (
    <Grid mt="1rem">
      <EpayAccordion
        expandIcon={<></>}
        title={f('avs.page.title.addressvalidation')}
        sectionType="Address Validation"
        sectionIsComplete={addressValidationIsComplete}
        isExpanded={addressValidationIsExpanded && !addressValidationIsEditable}
        isEditable={addressValidationIsEditable}
        editIsSelected={editAddressValidation}
      >
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Box mb="0.5rem">
              <Typography variant="fieldHeader">
                {f('avs.page.address')}
              </Typography>
            </Box>
            <TextField
              type="text"
              error={!!errors.addressInputValue}
              helperText={errors.addressInputValue || ''}
              value={addressInputValue}
              fullWidth
              sx={(muiTheme) => ({
                ...getCompactFilterFieldSx(muiTheme),
              })}
              onChange={(event) => {
                dispatch(setAddressInputValue(event.target.value));
                validateField('addressInputValue', event.target.value);
              }}
            />
          </Grid>

          <Grid item xs={6}>
            <Box mb="0.5rem">
              <Typography variant="fieldHeader">
                {f('avs.page.city')}
              </Typography>
            </Box>
            <TextField
              type="text"
              error={!!errors.cityInputValue}
              helperText={errors.cityInputValue || ''}
              value={cityInputValue}
              fullWidth
              sx={(muiTheme) => ({
                ...getCompactFilterFieldSx(muiTheme),
              })}
              onChange={(event) => {
                dispatch(setCityInputValue(event.target.value));
                validateField('cityInputValue', event.target.value);
              }}
            />
          </Grid>
        </Grid>

        <Grid container spacing={1} mt="1rem">
          <Grid item xs={6}>
            <Box mb="0.5rem">
              <Typography variant="fieldHeader">
                {f('avs.page.state')}
              </Typography>
            </Box>
            <Autocomplete
              options={usStates}
              getOptionLabel={(option) => option.name}
              slotProps={{
                paper: {
                  sx: {
                    '& .MuiAutocomplete-noOptions': {
                      color: theme.palette.primary.main,
                    },
                  },
                },
              }}
              value={
                usStates.find((state) => state.code === stateInputValue) || null
              }
              inputValue={inputValue}
              onInputChange={(event, newInputValue) => {
                setInputValue(newInputValue);
              }}
              onChange={(event, newValue) => {
                if (newValue) {
                  dispatch(setStateInputValue(newValue.code));
                  setInputValue(newValue.name);
                }
              }}
              filterOptions={(options, { inputValue }) => {
                return options.filter(
                  (option) =>
                    option.name
                      .toLowerCase()
                      .includes(inputValue.toLowerCase()) ||
                    option.code
                      .toLowerCase()
                      .includes(inputValue.toLowerCase()),
                );
              }}
              renderOption={(props, option) => (
                <MenuItem {...props} key={option.code} value={option.code}>
                  {option.name} ({option.code}){' '}
                </MenuItem>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  error={!!errors.stateInputValue}
                  helperText={errors.stateInputValue || ''}
                  fullWidth
                  sx={(muiTheme) => ({
                    ...getCompactFilterFieldSx(muiTheme),
                    '& .MuiSvgIcon-root': {
                      color: '#808897',
                    },
                  })}
                  onKeyDown={handleKeyDown}
                  onBlur={handleBlur}
                />
              )}
            />
          </Grid>

          {/* Zip Code Field */}
          <Grid item xs={6}>
            <Box mb="0.5rem">
              <Typography variant="fieldHeader">
                {f('avs.page.zipcode')}
              </Typography>
            </Box>
            <TextField
              id="zipcode-input"
              type="text"
              error={!!errors.zipcodeInputValue}
              helperText={errors.zipcodeInputValue || ''}
              value={zipcodeInputValue}
              fullWidth
              sx={(muiTheme) => ({
                ...getCompactFilterFieldSx(muiTheme),
              })}
              onChange={(event) => {
                dispatch(setZipcodeInputValue(event.target.value));
                validateField('zipcodeInputValue', event.target.value);
              }}
            />
          </Grid>
        </Grid>
        {!!addressValidationErrorMessage && (
          <Box mt="1rem">
            <Typography variant="fieldHeader" color="error">
              {addressValidationErrorMessage}
            </Typography>
          </Box>
        )}
        <Grid item container justifyContent="flex-end" mt="1rem">
          <Button
            variant="outlined"
            color="secondary"
            sx={{
              mr: '1rem',
            }}
            onClick={() => {
              setErrors({
                addressInputValue: false,
                cityInputValue: false,
                stateInputValue: false,
                zipcodeInputValue: false,
              });
              clearAddressValidation();
            }}
          >
            {f('avs.page.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleAddressValidation}
            disabled={!isFormValid}
            sx={{
              ...(isFormValid && {
                border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
                '&:hover': {
                  border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
                },
              }),
            }}
          >
            {f('user.register.continue')}
          </Button>
        </Grid>
      </EpayAccordion>
    </Grid>
  );
}
