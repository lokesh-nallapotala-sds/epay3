import { useState } from 'react';
import { useIntl } from 'react-intl';
import {
  Button,
  Checkbox,
  FormControlLabel,
  FormHelperText,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  EpayModalBody,
  EpayModalFooter,
  EpayModalHeader,
} from 'shared/components/EpayModalLayout';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';
interface TemplateProps {
  onClose: () => void;
  handleAddTemplateData: (templateName: string, copyValues: boolean) => void;
}

const reservedTemplateNames = new Set(['default', 'upload', 'public']);

// Modal for Add/Edit Template
export const AddTemplate = ({
  onClose,
  handleAddTemplateData,
}: TemplateProps) => {
  const intl = useIntl();
  const theme = useTheme();
  const f = (id: string) => intl.formatMessage({ id, defaultMessage: id });

  const [templateName, setTemplateName] = useState('');
  const [templateError, setTemplateError] = useState('');
  const [copyValues, setCopyValues] = useState(true);

  const closeModal = () => {
    onClose();
  };

  const saveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();

    const regex = /^[a-zA-Z0-9]*$/;
    const trimmedName = templateName.trim();

    if (trimmedName === '') {
      setTemplateError(f('configuration.theme.add_template_empty'));
      return;
    }

    if (!regex.test(trimmedName)) {
      setTemplateError(
        f('configuration.theme.template_name_special_characters_not_allowed'),
      );
      return;
    }

    if (trimmedName.length < 3) {
      setTemplateError(f('configuration.theme.template_name_too_short'));
      return;
    }

    if (reservedTemplateNames.has(trimmedName.toLowerCase())) {
      setTemplateError(f('configuration.theme.template_name_reserved'));
      return;
    }

    handleAddTemplateData(trimmedName, copyValues);

    onClose();
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const regex = /^[a-zA-Z0-9]*$/;

    setTemplateName(value);

    if (!regex.test(value)) {
      setTemplateError(
        f('configuration.theme.template_name_special_characters_not_allowed'),
      );
      return;
    }

    if (reservedTemplateNames.has(value.trim().toLowerCase())) {
      setTemplateError(f('configuration.theme.template_name_reserved'));
      return;
    }

    setTemplateError('');
  };

  return (
    <Grid container>
      <Grid item xs={12}>
        <EpayModalHeader
          heading={f('configuration.theme.header_add_template')}
        />
      </Grid>

      <Grid item xs={12}>
        <EpayModalBody>
          <Grid
            container
            direction="row"
            alignItems="flex-start"
            marginTop="2rem"
            marginBottom="2rem"
          >
            <Grid item xs={4} sx={{ pt: '0.875rem' }}>
              <Typography variant="h6">
                {f('configuration.theme.template_name')}
              </Typography>
            </Grid>
            <Grid item xs={8} container direction="column">
              <TextField
                type="text"
                fullWidth
                autoFocus
                value={templateName}
                onChange={handleTemplateChange}
                inputProps={{
                  'aria-label': f('configuration.theme.template_name'),
                  'aria-describedby': 'template-name-error',
                }}
                sx={(muiTheme) => ({
                  ...getCompactFilterFieldSx(muiTheme),
                })}
                error={!!templateError}
              />
              <FormHelperText
                id="template-name-error"
                error
                sx={{ mt: 0.5, mx: 0, minHeight: '1.25rem' }}
              >
                {templateError}
              </FormHelperText>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    color="primary"
                    checked={copyValues}
                    onChange={(e) => setCopyValues(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2">
                    {f('configuration.theme.copy_from_current')}
                  </Typography>
                }
              />
            </Grid>
          </Grid>
        </EpayModalBody>
      </Grid>

      <Grid item xs={12}>
        <EpayModalFooter>
          <Button variant="outlined" color="secondary" onClick={closeModal}>
            {f('configuration.theme.add_template_cancel_button')}
          </Button>
          <Button
            variant="contained"
            color="primary"
            sx={{
              border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
              '&:hover': {
                border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
              },
            }}
            onClick={saveTemplate}
          >
            {f('configuration.theme.add_template_button')}
          </Button>
        </EpayModalFooter>
      </Grid>
    </Grid>
  );
};
