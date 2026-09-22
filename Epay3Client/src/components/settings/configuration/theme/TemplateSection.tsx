import { ChangeEvent, Dispatch, SetStateAction, useRef } from 'react';
import AddIcon from '@mui/icons-material/Add';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import {
  Box,
  Divider,
  Grid,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useFormat } from 'hooks/useFormat';
import {
  compactFilterMenuItemSx,
  compactFilterSelectProps,
} from 'shared/components/compactFilterSelectStyles';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';

interface TemplateSectionProps {
  template: string;
  allTemplates: { key: string; label: string }[];
  changeTemplate: (name: string) => void;
  handleTemplateDelete: (templateLabel: string) => void;
  showURLGRID: boolean;
  selectedURL: string;
  selectedURLList: string[];
  handleURLChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  handleURLDelete: (urlToDelete: string) => void;
  setModalMode: Dispatch<SetStateAction<'template' | 'url'>>;
  setOpen: Dispatch<SetStateAction<boolean>>;
  onExport: () => void;
  onImportFileSelected: (event: ChangeEvent<HTMLInputElement>) => void;
}

const fieldLabelGridProps = { xs: 12, sm: 6 } as const;
const fieldControlGridProps = { xs: 12, sm: 6 } as const;
const flushEndIconButtonSx = { marginRight: '-13px' } as const;
const tooltipWrapperSx = { display: 'inline-flex' } as const;
const settingsTooltipSlotProps = {
  tooltip: {
    sx: {
      backgroundColor: '#ffffff',
      color: '#0D0D12',
      fontSize: '0.75rem',
      border: '1px solid #D1D5DB',
      boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
      borderRadius: '8px',
      padding: '6px 10px',
      fontWeight: 500,
    },
  },
} as const;

export default function TemplateSection({
  template,
  allTemplates,
  changeTemplate,
  handleTemplateDelete,
  showURLGRID,
  selectedURL,
  selectedURLList,
  handleURLChange,
  handleURLDelete,
  setModalMode,
  setOpen,
  onExport,
  onImportFileSelected,
}: TemplateSectionProps) {
  const f = useFormat();
  const importInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <Grid container direction="row" alignItems="center" rowSpacing={0.75}>
        <Grid item {...fieldLabelGridProps}>
          <Typography variant="h6">{f('configuration.theme.name')}</Typography>
        </Grid>

        <Grid
          item
          {...fieldControlGridProps}
          container
          direction="row"
          columnSpacing={1}
          alignItems="center"
          wrap="nowrap"
          sx={{ minWidth: 0 }}
        >
          <Grid item xs sx={{ minWidth: 0 }}>
            <TextField
              select
              fullWidth
              sx={(muiTheme) => ({
                ...getCompactFilterFieldSx(muiTheme),
              })}
              value={template}
              onChange={(event) => changeTemplate(event.target.value)}
              SelectProps={compactFilterSelectProps}
            >
              <MenuItem value="" disabled sx={compactFilterMenuItemSx}>
                <Typography variant="body2">
                  {f('configuration.theme.selectTemplate')}
                </Typography>
              </MenuItem>
              {allTemplates.map((template) => (
                <MenuItem
                  key={template.key}
                  value={template.label}
                  sx={compactFilterMenuItemSx}
                >
                  <Typography variant="body2">{template.label}</Typography>
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid
            item
            container
            columnSpacing={0.5}
            justifyContent="flex-end"
            alignItems="center"
            wrap="nowrap"
            sx={{ width: 'auto' }}
          >
            <Grid item justifyContent="center">
              <Tooltip
                title={f('configuration.theme.export')}
                placement="bottom-start"
                slotProps={settingsTooltipSlotProps}
              >
                <Box component="span" sx={tooltipWrapperSx}>
                  <IconButton
                    color="primary"
                    aria-label={f('configuration.theme.export')}
                    disabled={!template}
                    onClick={onExport}
                  >
                    <FileDownloadOutlinedIcon />
                  </IconButton>
                </Box>
              </Tooltip>
            </Grid>
            <Grid item justifyContent="center">
              <Tooltip
                title={f('configuration.theme.import')}
                placement="bottom-start"
                slotProps={settingsTooltipSlotProps}
              >
                <Box component="span" sx={tooltipWrapperSx}>
                  <IconButton
                    color="primary"
                    aria-label={f('configuration.theme.import')}
                    disabled={!template}
                    onClick={() => importInputRef.current?.click()}
                  >
                    <FileUploadOutlinedIcon />
                  </IconButton>
                </Box>
              </Tooltip>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                style={{ display: 'none' }}
                onChange={onImportFileSelected}
              />
            </Grid>
            <Grid item justifyContent="center">
              <Tooltip
                title={f('configuration.theme.name_add')}
                placement="bottom-start"
                slotProps={settingsTooltipSlotProps}
              >
                <Box component="span" sx={tooltipWrapperSx}>
                  <IconButton
                    color="primary"
                    aria-label={f('configuration.theme.name_add')}
                    onClick={() => {
                      setModalMode('template');
                      setOpen(true);
                    }}
                  >
                    <AddIcon />
                  </IconButton>
                </Box>
              </Tooltip>
            </Grid>
            <Grid item justifyContent="center">
              <Tooltip
                title={f('configuration.theme.name_delete')}
                placement="bottom-start"
                slotProps={settingsTooltipSlotProps}
              >
                <Box component="span" sx={tooltipWrapperSx}>
                  <IconButton
                    color="primary"
                    aria-label={f('configuration.theme.name_delete')}
                    onClick={() => {
                      handleTemplateDelete(template);
                    }}
                    sx={flushEndIconButtonSx}
                  >
                    <DeleteIcon sx={{ fontSize: '1.5rem' }} />
                  </IconButton>
                </Box>
              </Tooltip>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      {showURLGRID && (
        <Grid container direction="row" alignItems="center" rowSpacing={0.75}>
          <Grid item {...fieldLabelGridProps}>
            <Typography variant="h6">
              {f('configuration.theme.url_match')}
            </Typography>
          </Grid>
          <Grid
            item
            {...fieldControlGridProps}
            container
            direction="row"
            columnSpacing={1}
            alignItems="center"
            wrap="nowrap"
            sx={{ minWidth: 0 }}
          >
            <Grid item xs sx={{ minWidth: 0 }}>
              <TextField
                select
                fullWidth
                sx={(muiTheme) => ({
                  ...getCompactFilterFieldSx(muiTheme),
                })}
                value={selectedURL}
                onChange={handleURLChange}
                SelectProps={compactFilterSelectProps}
              >
                {selectedURLList.map((url) => (
                  <MenuItem key={url} value={url} sx={compactFilterMenuItemSx}>
                    <Typography variant="body2">{url}</Typography>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid
              item
              container
              columnSpacing={0.5}
              justifyContent="flex-end"
              alignItems="center"
              wrap="nowrap"
              sx={{ width: 'auto' }}
            >
              <Grid item justifyContent="center">
                <Tooltip
                  title={f('configuration.theme.add')}
                  placement="bottom-start"
                  slotProps={settingsTooltipSlotProps}
                >
                  <Box component="span" sx={tooltipWrapperSx}>
                    <IconButton
                      color="primary"
                      aria-label={f('configuration.theme.add')}
                      onClick={() => {
                        setModalMode('url');
                        setOpen(true);
                      }}
                    >
                      <AddIcon />
                    </IconButton>
                  </Box>
                </Tooltip>
              </Grid>
              <Grid item justifyContent="center">
                <Tooltip
                  title={f('configuration.theme.delete')}
                  placement="bottom-start"
                  slotProps={settingsTooltipSlotProps}
                >
                  <Box component="span" sx={tooltipWrapperSx}>
                    <IconButton
                      color="primary"
                      aria-label={f('configuration.theme.delete')}
                      onClick={() => {
                        handleURLDelete(selectedURL);
                      }}
                      sx={flushEndIconButtonSx}
                    >
                      <DeleteIcon sx={{ fontSize: '1.5rem' }} />
                    </IconButton>
                  </Box>
                </Tooltip>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      )}
      <Divider />
    </>
  );
}
