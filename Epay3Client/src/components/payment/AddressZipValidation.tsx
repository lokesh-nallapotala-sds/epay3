import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Button, Grid, TextField, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import EpayAccordion from 'shared/components/EpayAccordion';
import { addressSelector, setZipcodeInputValue } from 'redux/reducers';
import { useIntl } from 'react-intl';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';

export interface AddressZipValidationProps {
  handleAddressValidation: () => void;
  clearAddressValidation: () => void;
  editAddressValidation: (sectionType: string) => void;
}

export default function AddressZipValidation({
  handleAddressValidation,
  clearAddressValidation,
  editAddressValidation,
}: AddressZipValidationProps) {
  const dispatch = useDispatch();
  const intl = useIntl();
  const theme = useTheme();
  const f = (id) => intl.formatMessage({ id: id });
  const {
    zipcodeInputValue,
    addressValidationErrorMessage,
    addressValidationIsExpanded,
    addressValidationIsComplete,
    addressValidationIsEditable,
  } = useSelector(addressSelector);

  const [error, setError] = useState<string | false>(false);
  const [isValid, setIsValid] = useState(false);

  const validateZip = (value: string) => {
    if (!value.trim()) {
      setError('This field is required.');
    } else if (!/^\d{5}$/.test(value)) {
      setError('Enter a valid 5-digit ZIP code.');
    } else {
      setError(false);
    }
  };

  useEffect(() => {
    setIsValid(error === false && zipcodeInputValue.trim() !== '');
  }, [error, zipcodeInputValue]);

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
                {f('avs.page.zipcode')}
              </Typography>
            </Box>
            <TextField
              id="zipcode-input"
              type="text"
              error={!!error}
              helperText={error || ''}
              value={zipcodeInputValue}
              fullWidth
              sx={(muiTheme) => ({
                ...getCompactFilterFieldSx(muiTheme),
              })}
              onChange={(event) => {
                dispatch(setZipcodeInputValue(event.target.value));
                validateZip(event.target.value);
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
              setError(false);
              clearAddressValidation();
            }}
          >
            {f('avs.page.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleAddressValidation}
            disabled={!isValid}
            sx={{
              ...(isValid && {
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
