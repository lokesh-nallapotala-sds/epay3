import { ChangeEvent, useState } from 'react';
import { useTheme } from '@mui/system';
import { EpayTabContext } from 'shared/components/EpayTabs';
import { ThemeConfig } from 'types/ThemeConfig';
import { Box, Button, Grid, Typography, useMediaQuery } from '@mui/material';

import { ModalPopup } from './ModalPopUp';
import DeleteConfirmModal from '../users/DeleteConfirmModal';
import EpayConfirmDialog from 'shared/components/EpayConfirmDialog';
import TemplateSection from './theme/TemplateSection';
import LoginPageSection from './theme/LoginPageSection';
import BrandingSection from './theme/BrandingSection';
import ColorsSection from './theme/ColorsSection';
import { useThemeBranding } from './theme/useThemeBranding';
import { useBannerContent } from './theme/useBannerContent';
import { useThemeUrls } from './theme/useThemeUrls';
import { useTemplateManager } from './theme/useTemplateManager';
import { useThemePortability } from './theme/useThemePortability';
import { useThemeSave } from './theme/useThemeSave';
import { useFormat } from 'hooks/useFormat';

export default function ThemeConfigurationPage() {
  const f = useFormat();
  const theme = useTheme();
  const [initialValues, setInitialValues] = useState<ThemeConfig[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<ThemeConfig>();
  const [open, setOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'template' | 'url'>('template');
  const handleClose = () => setOpen(false);
  const lgUp = useMediaQuery(theme.breakpoints.up('lg'));

  const {
    logoData,
    setLogoData,
    iconData,
    setIconData,
    logo,
    setLogo,
    icon,
    setIcon,
    logoRef,
    iconRef,
    handleIconDataChange,
    handleLogoDataChange,
  } = useThemeBranding();

  const {
    banners,
    setBanners,
    selectedLanguage,
    setSelectedLanguage,
    selectedLanguageError,
    bannerText1,
    setBannerText1,
    bannerText2,
    setBannerText2,
    handleBannerLanguage,
    handleBannerText1Change,
    handleBannerText2Change,
  } = useBannerContent();

  const {
    selectedURL,
    setSelectedURL,
    selectedURLList,
    setSelectedURLList,
    showURLGRID,
    setShowURLGRID,
    getURLData,
    handleURLChange,
    handleURLDelete,
  } = useThemeUrls(selectedTheme, setSelectedTheme);

  const {
    template,
    allTemplates,
    modalOpen,
    getTemplateData,
    changeTemplate,
    handleTemplateDelete,
    handleDeleteClose,
    handleOk,
  } = useTemplateManager({
    initialValues,
    setInitialValues,
    selectedTheme,
    setSelectedTheme,
    banners,
    selectedLanguage,
    bannerText1,
    bannerText2,
    logoData,
    iconData,
    setLogo,
    setLogoData,
    setIcon,
    setIconData,
    setBanners,
    setSelectedLanguage,
    setBannerText1,
    setBannerText2,
    setSelectedURL,
    setSelectedURLList,
    setShowURLGRID,
    f,
  });

  const {
    pendingImport,
    handleExport,
    handleImportFile,
    confirmImport,
    cancelImport,
  } = useThemePortability({
    selectedTheme,
    setSelectedTheme,
    setInitialValues,
    template,
    banners,
    setBanners,
    selectedLanguage,
    bannerText1,
    setBannerText1,
    bannerText2,
    setBannerText2,
    logoData,
    setLogoData,
    iconData,
    setIconData,
    setLogo,
    setIcon,
    f,
  });

  const importConfirmMessage = pendingImport
    ? [
        `${f('configuration.theme.import_confirm_source_template')}: ${
          pendingImport.sourceTheme.replace(/^theme_/, '') || '—'
        }`,
        `${f('configuration.theme.import_confirm_source_system')}: ${
          pendingImport.sourceHost || '—'
        }`,
        `${f('configuration.theme.import_confirm_target_template')}: ${template}`,
        '',
        f('configuration.theme.import_confirm_note'),
        `- ${f('configuration.theme.import_confirm_urls')}`,
        `- ${f('configuration.theme.import_confirm_empty')}`,
        `- ${f('configuration.theme.import_confirm_save')}`,
      ].join('\n')
    : '';

  const { handleSubmit, handleReset } = useThemeSave({
    selectedTheme,
    setSelectedTheme,
    initialValues,
    setInitialValues,
    banners,
    setBanners,
    selectedLanguage,
    bannerText1,
    setBannerText1,
    bannerText2,
    setBannerText2,
    logo,
    setLogo,
    logoData,
    setLogoData,
    icon,
    setIcon,
    iconData,
    setIconData,
    logoRef,
    f,
  });

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (selectedTheme) {
      const updatedTheme = { ...selectedTheme, brandTitle: e.target.value };
      setSelectedTheme(updatedTheme);
    }
  };

  const handleApplicationName = (e: ChangeEvent<HTMLInputElement>) => {
    if (selectedTheme) {
      const updatedTheme = {
        ...selectedTheme,
        applicationName: e.target.value,
      };
      setSelectedTheme(updatedTheme);
    }
  };

  const handleColorChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (selectedTheme) {
      const updatedTheme = {
        ...selectedTheme,
        [e.target.name]: e.target.value,
      };
      setSelectedTheme(updatedTheme);
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
      }}
    >
      <EpayTabContext value="1">
        <Box
          display="flex"
          width="100%"
          justifyContent={lgUp ? 'flex-start' : 'center'}
        >
          <Grid container direction="column" rowGap="1.5rem">
            {/*******************************Template***********************************/}
            <Grid item>
              <Typography variant="h2">
                {f('configuration.theme.template')}
              </Typography>
            </Grid>

            <Grid
              item
              container
              direction="column"
              rowGap="1.5rem"
              sx={{ mt: '-0.40rem' }}
            >
              <TemplateSection
                template={template}
                allTemplates={allTemplates}
                changeTemplate={changeTemplate}
                handleTemplateDelete={handleTemplateDelete}
                showURLGRID={showURLGRID}
                selectedURL={selectedURL}
                selectedURLList={selectedURLList}
                handleURLChange={handleURLChange}
                handleURLDelete={handleURLDelete}
                setModalMode={setModalMode}
                setOpen={setOpen}
                onExport={handleExport}
                onImportFileSelected={handleImportFile}
              />
              <LoginPageSection
                selectedTheme={selectedTheme}
                selectedLanguage={selectedLanguage}
                selectedLanguageError={selectedLanguageError}
                bannerText1={bannerText1}
                bannerText2={bannerText2}
                handleBannerLanguage={handleBannerLanguage}
                handleBannerText1Change={handleBannerText1Change}
                handleBannerText2Change={handleBannerText2Change}
                handleColorChange={handleColorChange}
                handleReset={handleReset}
              />
              <BrandingSection
                selectedTheme={selectedTheme}
                logo={logo}
                icon={icon}
                logoRef={logoRef}
                iconRef={iconRef}
                handleLogoDataChange={handleLogoDataChange}
                handleIconDataChange={handleIconDataChange}
                handleTitleChange={handleTitleChange}
                handleApplicationName={handleApplicationName}
              />
              <ColorsSection
                selectedTheme={selectedTheme}
                handleColorChange={handleColorChange}
              />
            </Grid>

            <Grid
              item
              container
              direction="row"
              justifyContent="flex-end"
              alignItems="center"
              marginTop="1.5rem"
            >
              <Button
                variant="contained"
                color="primary"
                type="submit"
                sx={{
                  width: '250px',
                  border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
                  '&:hover': {
                    border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
                  },
                }}
                onClick={handleSubmit}
              >
                {f('configuration.theme.save')}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </EpayTabContext>
      <Grid>
        <ModalPopup
          open={open}
          handleAddURL={getURLData}
          handleClose={handleClose}
          handleAddTemplate={getTemplateData}
          mode={modalMode}
        />
        <DeleteConfirmModal
          open={modalOpen}
          onClose={handleDeleteClose}
          onOk={handleOk}
          message={f('configuration.theme.confirm_delete_template')}
        />
        <EpayConfirmDialog
          open={!!pendingImport}
          onClose={cancelImport}
          title={f('configuration.theme.import_confirm_title')}
          // Wide enough for the longest "Please Note" line to stay unwrapped.
          maxWidth="640px"
          message={importConfirmMessage}
          onConfirm={confirmImport}
          cancelLabel={f('app.common.cancel')}
          confirmLabel={f('app.common.ok')}
        />
      </Grid>
    </Box>
  );
}
