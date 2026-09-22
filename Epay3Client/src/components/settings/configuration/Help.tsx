import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import {
  Box,
  Button,
  Grid,
  MenuItem,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useEpayToast } from 'providers/EpayToastProvider';
import { useFormat } from 'hooks/useFormat';
import { useAppDispatch } from 'redux/hooks';
import { ePayApi } from 'redux/api/ePayApi';
import { getLanguageOptions } from 'constants/languages';
import {
  compactFilterMenuItemSx,
  compactFilterSelectProps,
} from 'shared/components/compactFilterSelectStyles';
import { EpayApplicationService } from 'services/EpayApplicationService';
import { normalizeRoutePath } from 'utilities/helpScreenMatch';
import { HelpConfigRequest, HelpScreenConfig } from 'types/AppConfigRequest';
import HelpScreenSection from './help/HelpScreenSection';
import HelpTextEditor from './help/HelpTextEditor';
import { AddScreenModal } from './help/AddScreenModal';
import {
  HELP_CONFIG_FILE_NAME,
  parseHelpConfigFile,
} from './help/helpConfigFile';

const LANGUAGE_OPTIONS = getLanguageOptions();

function HelpPage() {
  const theme = useTheme();
  const lgUp = useMediaQuery(theme.breakpoints.up('lg'));
  const f = useFormat();
  const { showToastMessage } = useEpayToast();
  const dispatch = useAppDispatch();

  const getHelpConfig = EpayApplicationService.useGetHelpConfig();
  const updateHelpConfig = EpayApplicationService.useUpdateHelpConfig();

  const [isHelpEnabled, setIsHelpEnabled] = useState(false);
  const [screens, setScreens] = useState<HelpScreenConfig[]>([]);
  const [selectedScreenPath, setSelectedScreenPath] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [addScreenOpen, setAddScreenOpen] = useState(false);
  // Blocks Save while the stored config couldn't be loaded — saving over a
  // form that only *looks* empty (SAP down, network error) would wipe it.
  const [loadFailed, setLoadFailed] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getHelpConfig()
      .then((resp: HelpConfigRequest) => {
        if (resp.loadFailed) {
          setLoadFailed(true);
          showToastMessage('error', f('configuration.help.load_failed'));
          return;
        }
        setLoadFailed(false);
        setIsHelpEnabled(resp.isHelpEnabled ?? false);
        setScreens(resp.screens ?? []);
        setSelectedScreenPath(resp.screens?.[0]?.path ?? '');
      })
      .catch(() => {
        setLoadFailed(true);
        showToastMessage('error', f('configuration.help.load_failed'));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedScreen = screens.find((s) => s.path === selectedScreenPath);

  const updateSelectedScreen = (patch: Partial<HelpScreenConfig>) => {
    setScreens((prev) =>
      prev.map((s) => (s.path === selectedScreenPath ? { ...s, ...patch } : s)),
    );
  };

  const handleAddScreen = (name: string, path: string) => {
    // Dedupe on the normalized route so "/Home/" can't be added alongside
    // "/home" — they'd resolve to the same screen on the client.
    const existing = screens.find(
      (s) => normalizeRoutePath(s.path) === normalizeRoutePath(path),
    );
    if (existing) {
      setSelectedScreenPath(existing.path);
      return;
    }
    setScreens((prev) => [...prev, { name, path, helpText: {} }]);
    setSelectedScreenPath(path);
  };

  const handleHelpTextChange = (html: string) => {
    if (!selectedScreen) return;
    updateSelectedScreen({
      helpText: { ...selectedScreen.helpText, [selectedLanguage]: html },
    });
  };

  // Reorders the stored list itself (not just the view) — screen order is part
  // of the saved config, so it survives Save and flows through Export/Import.
  const handleMoveScreen = (direction: -1 | 1) => {
    setScreens((prev) => {
      const index = prev.findIndex((s) => s.path === selectedScreenPath);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleDeleteScreen = () => {
    const remaining = screens.filter((s) => s.path !== selectedScreenPath);
    setScreens(remaining);
    // Select the next remaining screen rather than clearing to '' — an empty
    // value would put the MUI Select out of range and strand the delete button
    // in its disabled state until a manual reselect.
    setSelectedScreenPath(remaining[0]?.path ?? '');
  };

  const handleExport = () => {
    const data: HelpConfigRequest = { isHelpEnabled, screens };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    saveAs(blob, HELP_CONFIG_FILE_NAME);
  };

  const handleImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so choosing the same file again still fires a change event.
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = parseHelpConfigFile(reader.result as string);
        setIsHelpEnabled(imported.isHelpEnabled);
        setScreens(imported.screens);
        setSelectedScreenPath(imported.screens[0]?.path ?? '');
        // Deliberately not saved yet — the BA reviews the imported content and
        // clicks Save, which also runs it through the server-side sanitizer.
        showToastMessage('success', f('configuration.help.import_success'));
      } catch {
        showToastMessage('error', f('configuration.help.import_invalid'));
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = () => {
    const request: HelpConfigRequest = { isHelpEnabled, screens };

    updateHelpConfig(request)
      .then((resp: HelpConfigRequest) => {
        setIsHelpEnabled(resp.isHelpEnabled ?? false);
        setScreens(resp.screens ?? []);
        dispatch(ePayApi.util.invalidateTags(['HelpConfig']));
        showToastMessage(
          'success',
          f('configuration.saved_configuration_message'),
        );
      })
      .catch((error: Error) => {
        showToastMessage('error', error.message ?? error.toString());
      });
  };

  return (
    <Box
      display="flex"
      width="100%"
      justifyContent={lgUp ? 'flex-start' : 'center'}
    >
      <Grid container direction="column" rowGap="1.5rem">
        <Grid item>
          <Typography variant="h2">
            {f('configuration.help.settings')}
          </Typography>
        </Grid>

        <Grid item container direction="column" rowGap="1.5rem">
          <Grid item container direction="row" alignItems="center">
            <Grid item xs={6}>
              <Typography variant="h6">
                {f('configuration.help.enable')}
              </Typography>
            </Grid>
            <Grid item xs={6} container justifyContent="flex-end">
              <Grid item>
                <Switch
                  color="primary"
                  checked={isHelpEnabled}
                  onChange={(e) => setIsHelpEnabled(e.target.checked)}
                  // The checked knob's right edge sits 9px inside the Switch
                  // box — cancel exactly that so it ends flush with the fields.
                  sx={{ marginRight: '-9px' }}
                />
              </Grid>
            </Grid>
          </Grid>

          <HelpScreenSection
            screens={screens.map((s) => ({ name: s.name, path: s.path }))}
            selectedScreenPath={selectedScreenPath}
            onSelectScreen={setSelectedScreenPath}
            onMoveScreen={handleMoveScreen}
            onAddScreenClick={() => setAddScreenOpen(true)}
            onDeleteScreen={handleDeleteScreen}
          />

          <Grid item container direction="row" alignItems="center">
            <Grid item xs={6}>
              <Typography variant="h6">
                {f('configuration.help.language')}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                fullWidth
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                SelectProps={compactFilterSelectProps}
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <MenuItem
                    key={option.language}
                    value={option.language}
                    sx={compactFilterMenuItemSx}
                  >
                    <Typography variant="body2">{option.title}</Typography>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <Grid item container direction="row" alignItems="center">
            <Grid item xs={6}>
              <Typography variant="h6">
                {f('configuration.help.text')}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Grid container direction="column" rowGap=".67rem">
                <Grid item>
                  <HelpTextEditor
                    value={selectedScreen?.helpText?.[selectedLanguage] ?? ''}
                    disabled={!selectedScreen}
                    onChange={handleHelpTextChange}
                  />
                </Grid>
                <Grid item>
                  <Typography variant="subheader">
                    {f('configuration.help.text_hint')}
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>

          <Grid
            item
            container
            direction="row"
            justifyContent="flex-end"
            alignItems="center"
            columnGap="1rem"
            marginTop="1.5rem"
          >
            <Button variant="outlined" color="secondary" onClick={handleExport}>
              {f('configuration.help.export')}
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => importInputRef.current?.click()}
            >
              {f('configuration.help.import')}
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={handleImportFile}
            />
            <Button
              variant="contained"
              color="primary"
              disabled={loadFailed}
              sx={{
                width: '250px',
                border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
                '&:hover': {
                  border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
                },
              }}
              onClick={handleSubmit}
            >
              {f('configuration.system_maintenance_Save')}
            </Button>
          </Grid>
        </Grid>
      </Grid>

      <AddScreenModal
        open={addScreenOpen}
        onClose={() => setAddScreenOpen(false)}
        onAddScreen={handleAddScreen}
      />
    </Box>
  );
}

export default HelpPage;
