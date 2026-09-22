import { ChangeEvent } from 'react';

import { useIntl } from 'react-intl';

import Grid from '@mui/material/Grid';
import { Box, useTheme } from '@mui/system';
import { html } from '@codemirror/lang-html';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { EmailTemplates } from 'constants/EmailTemplates';
import { TemplateLanguages } from 'constants/TemplateLanguages';
import { useNonce } from 'providers/NonceProvider';
import {
  compactFilterMenuItemSx,
  compactFilterSelectProps,
} from 'shared/components/compactFilterSelectStyles';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';
import { Button, MenuItem, TextField, Typography } from '@mui/material';

import { EmailTemplate } from 'components/settings/configuration/EmailConfig';

interface EmailTemplatesSectionProps {
  selectedKey: string;
  emailTemplate: EmailTemplate;
  emailSubjectError: string;
  handleTemplateType: (event: ChangeEvent<HTMLInputElement>) => void;
  handleTemplateLanguage: (event: ChangeEvent<HTMLInputElement>) => void;
  handleEmailSubject: (event: ChangeEvent<HTMLInputElement>) => void;
  handleEditorChange: (value: string) => void;
  handleResetToDefault: () => Promise<void>;
}

function EmailTemplatesSection({
  selectedKey,
  emailTemplate,
  emailSubjectError,
  handleTemplateType,
  handleTemplateLanguage,
  handleEmailSubject,
  handleEditorChange,
  handleResetToDefault,
}: EmailTemplatesSectionProps) {
  const intl = useIntl();
  const f = (id) => intl.formatMessage({ id: id });
  const theme = useTheme();
  const nonce = useNonce();

  return (
    <>
      <Grid item>
        <Typography variant="h2">
          {f('configuration.email.templates')}
        </Typography>
      </Grid>
      <Grid item container direction="row" alignItems="center">
        <Grid item xs={6}>
          <Typography variant="h6">
            {f('configuration.email.template_type_label')}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <TextField
            select
            fullWidth
            sx={(muiTheme) => ({
              ...getCompactFilterFieldSx(muiTheme),
            })}
            value={selectedKey}
            onChange={handleTemplateType}
            SelectProps={compactFilterSelectProps}
          >
            {EmailTemplates.map((template) => (
              <MenuItem
                key={template.key}
                value={template.key}
                sx={compactFilterMenuItemSx}
              >
                <Typography variant="body2">{template.value}</Typography>
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>
      <Grid item container direction="row" alignItems="center">
        <Grid item xs={6}>
          <Typography variant="h6">
            {f('configuration.email.template_language_label')}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <TextField
            select
            fullWidth
            sx={(muiTheme) => ({
              ...getCompactFilterFieldSx(muiTheme),
            })}
            value={emailTemplate.language}
            onChange={handleTemplateLanguage}
            SelectProps={compactFilterSelectProps}
          >
            {TemplateLanguages.map((language) => (
              <MenuItem
                key={language.key}
                value={language.key}
                sx={compactFilterMenuItemSx}
              >
                <Typography variant="body2">{language.value}</Typography>
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>
      <Grid item container direction="row" alignItems="center">
        <Grid item xs={6}>
          <Typography variant="h6">
            {f('configuration.email_subject_label')}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <TextField
            type="text"
            fullWidth
            sx={(muiTheme) => ({
              ...getCompactFilterFieldSx(muiTheme),
            })}
            placeholder={f('configuration.email_subject_label')}
            value={emailTemplate.title}
            onChange={handleEmailSubject}
            error={emailSubjectError !== ''}
            helperText={emailSubjectError}
          />
        </Grid>
      </Grid>
      <Grid item container direction="row" alignItems="center">
        <Grid item xs={6}>
          <Typography variant="h6">
            {f('configuration.email_body_label')}
          </Typography>
        </Grid>
      </Grid>
      <Grid item container direction="row" alignItems="center">
        <Grid item xs={12}>
          <Box sx={{ width: '100%' }}>
            <CodeMirror
              value={emailTemplate.email}
              height="500px"
              extensions={[
                html(),
                EditorView.lineWrapping,
                EditorView.cspNonce.of(nonce),
              ]}
              onChange={handleEditorChange}
            />
            <Box mt={1.5} display="flex" justifyContent="flex-end">
              <Button
                type="button"
                variant="contained"
                color="primary"
                size="small"
                onClick={handleResetToDefault}
                sx={{
                  minWidth: '11rem',
                  border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
                  '&:hover': {
                    border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
                  },
                }}
              >
                {f('configuration.theme.editor.reset')}
              </Button>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </>
  );
}

export default EmailTemplatesSection;
