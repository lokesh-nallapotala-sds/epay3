import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { Banner, ThemeConfig } from 'types/ThemeConfig';
import { useEpayToast } from 'providers/EpayToastProvider';
import { EpayThemeConfigurationService } from 'services/EpayThemeConfigurationService';

import { createDefaultTheme } from './themeDefaults';
import { dataUriToObjectUrl } from './themePortability';

interface UseTemplateManagerDeps {
  initialValues: ThemeConfig[];
  setInitialValues: Dispatch<SetStateAction<ThemeConfig[]>>;
  selectedTheme: ThemeConfig | undefined;
  setSelectedTheme: Dispatch<SetStateAction<ThemeConfig | undefined>>;
  banners: Banner[];
  selectedLanguage: string;
  bannerText1: string;
  bannerText2: string;
  logoData: string;
  iconData: string;
  setLogo: Dispatch<SetStateAction<string | null>>;
  setLogoData: Dispatch<SetStateAction<string>>;
  setIcon: Dispatch<SetStateAction<string | null>>;
  setIconData: Dispatch<SetStateAction<string>>;
  setBanners: Dispatch<SetStateAction<Banner[]>>;
  setSelectedLanguage: Dispatch<SetStateAction<string>>;
  setBannerText1: Dispatch<SetStateAction<string>>;
  setBannerText2: Dispatch<SetStateAction<string>>;
  setSelectedURL: Dispatch<SetStateAction<string>>;
  setSelectedURLList: Dispatch<SetStateAction<string[]>>;
  setShowURLGRID: Dispatch<SetStateAction<boolean>>;
  f: (id: string) => string;
}

export function useTemplateManager({
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
}: UseTemplateManagerDeps) {
  const [template, setTemplate] = useState('');
  const [allTemplates, setAllTemplates] = useState<
    { key: string; label: string }[]
  >([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ThemeConfig | null>(
    null,
  );
  const getThemeConfiguration =
    EpayThemeConfigurationService.useGetThemeConfiguration();
  const deleteThemeConfiguration =
    EpayThemeConfigurationService.useDeleteThemeConfiguration();
  const { showToastMessage } = useEpayToast();

  const resolveThemeAssetPreview = (
    assetData: string,
    savedAssetPath: string,
  ) =>
    assetData.startsWith('data:')
      ? dataUriToObjectUrl(assetData)
      : savedAssetPath;

  function getKeyByLabel(label) {
    const foundTemplate = allTemplates.find(
      (template) => template.label === label,
    );
    return foundTemplate ? foundTemplate.key : null;
  }

  const getTemplateData = (newTemplateName: string, copyValues = false) => {
    const trimmedName = newTemplateName.trim();

    const exists = allTemplates.some(
      (t) =>
        t.label.trim().toLowerCase() === newTemplateName.trim().toLowerCase(),
    );

    if (exists) {
      showToastMessage(
        'error',
        f('configuration.theme.template_already_exists'),
      );
      return;
    }

    const nextKey = `theme_${trimmedName}`;

    const newTemplate = {
      key: nextKey,
      label: trimmedName,
    };

    setAllTemplates((prev) => [...prev, newTemplate]);

    if (copyValues && selectedTheme) {
      // Clone the on-screen state of the current template — everything except
      // its URLs, which are always bound manually on the new template.
      const mergedBanners = banners.map((banner) => ({ ...banner }));
      const index = mergedBanners.findIndex(
        (banner) => banner.language === selectedLanguage,
      );
      if (index >= 0) {
        mergedBanners[index] = {
          ...mergedBanners[index],
          text1: bannerText1,
          text2: bannerText2,
        };
      } else if (bannerText1 || bannerText2) {
        mergedBanners.push({
          language: selectedLanguage,
          content: '',
          text1: bannerText1,
          text2: bannerText2,
        });
      }

      const newTheme: ThemeConfig = {
        ...selectedTheme,
        name: nextKey,
        urls: [],
        banners: mergedBanners,
        brandLogo: logoData,
        brandIcon: iconData,
      };

      setInitialValues((prev) => [...prev, newTheme]);
      setSelectedTheme(newTheme);
      setTemplate(newTemplate.label);
      setShowURLGRID(true);
      setBanners(mergedBanners);
      setSelectedURLList([]);
      setSelectedURL('');
      // Preview via object URLs — the CSP blocks data: in img-src, and the
      // clone has no saved wwwroot files yet.
      setLogo(logoData ? dataUriToObjectUrl(logoData) : null);
      setIcon(iconData ? dataUriToObjectUrl(iconData) : null);
      return;
    }

    const newTheme: ThemeConfig = createDefaultTheme(nextKey);

    setInitialValues((prev) => [...prev, newTheme]);

    setSelectedTheme(newTheme);
    setTemplate(newTemplate.label);
    setShowURLGRID(true);
    setLogo(null);
    setIcon(null);
    setBanners([]);
    setSelectedURLList([]);
    setSelectedURL('');
    setBannerText1('');
    setBannerText2('');
  };

  const setValues = async (values: ThemeConfig[]) => {
    let nextValues = [...values];
    let theme = nextValues.find(
      (x) => x.name === 'theme_default',
    ) as ThemeConfig;
    if (!theme) {
      theme = createDefaultTheme('theme_default');
      nextValues = [...nextValues, theme];
    }
    setSelectedTheme(theme);
    setInitialValues(nextValues);
    const templates = nextValues.map((t) => ({
      key: t.name,
      label:
        t.name
          .replace(/^theme_/, '')
          .charAt(0)
          .toUpperCase() + t.name.replace(/^theme_/, '').slice(1),
    }));
    setAllTemplates(templates);
    setTemplate(
      templates.find((t) => t.key === theme.name)?.label || 'Default',
    );

    const themeName =
      theme.name.substring(theme.name.indexOf('_') + 1) == 'default' ||
      theme.name.substring(theme.name.indexOf('_') + 1) == 'localhost'
        ? 'default'
        : theme.name.substring(theme.name.indexOf('_') + 1);

    if (theme.brandLogo) {
      const logo = themeName + '/logo.png';
      setLogo(logo);
      setLogoData(theme.brandLogo);
    }

    if (theme.brandIcon) {
      const icon = themeName + '/favicon.ico';
      setIcon(icon);
      setIconData(theme.brandIcon);
    }

    if (theme.banners.length > 0) {
      const currentBanner = theme.banners.find((x) => x.language === 'en');
      if (currentBanner) {
        setBannerText1(currentBanner.text1 || '');
        setBannerText2(currentBanner.text2 || '');
      } else {
        setSelectedLanguage(theme.banners[0].language);
        setBannerText1(theme.banners[0].text1 || '');
        setBannerText2(theme.banners[0].text2 || '');
      }
    }
    setBanners(theme.banners);

    return;
  };

  const changeTemplate = async (name: string) => {
    const labelName = getKeyByLabel(name);

    if (labelName != 'theme_default') {
      setShowURLGRID(true);
    } else {
      setShowURLGRID(false);
    }

    if (selectedTheme) {
      const theme = initialValues.find((x) => x.name === labelName);
      const themeName =
        labelName?.substring(labelName.indexOf('_') + 1) || 'default';

      if (theme?.brandLogo) {
        setLogo(
          resolveThemeAssetPreview(theme.brandLogo, `${themeName}/logo.png`),
        );
        setLogoData(theme.brandLogo);
      } else {
        setLogo(null);
        setLogoData('');
      }

      if (theme?.brandIcon) {
        setIcon(
          resolveThemeAssetPreview(theme.brandIcon, `${themeName}/favicon.ico`),
        );
        setIconData(theme.brandIcon);
      } else {
        setIcon(null);
        setIconData('');
      }

      if (!theme) {
        const newTheme: ThemeConfig = createDefaultTheme(
          labelName == null ? '' : labelName,
        );
        const updatedInitialValues = [...initialValues, newTheme];
        setInitialValues(updatedInitialValues);
        setSelectedTheme(newTheme);
        setBanners([]);
        setSelectedURLList([]);
        setSelectedURL('');
        setBannerText1('');
        setBannerText2('');
      } else {
        setSelectedTheme(theme);
        setBanners(theme.banners ?? []);
        setSelectedURLList(theme.urls == undefined ? [] : [...theme.urls]);
        setSelectedURL(theme.urls?.[0] == undefined ? '' : theme.urls[0]);
        const index = theme.banners.findIndex((x) => x.language === 'en');
        if (index !== undefined && index >= 0) {
          setBannerText1(theme.banners[index].text1 || '');
          setBannerText2(theme.banners[index].text2 || '');
        } else {
          setBannerText1('');
          setBannerText2('');
        }
      }
      setTemplate(name);
    }
  };

  useEffect(() => {
    getThemeConfiguration()
      .then((resp) => {
        if (resp && resp.length > 0) {
          setValues(resp);
        } else {
          setValues([]);
        }
      })
      .catch((error) => {
        const errMsg = (error.message as string)?.replace('\n', '; ');
        showToastMessage('error', errMsg);
      });
  }, []);

  const handleTemplateDelete = async (templateLabel: string) => {
    const templateKey = getKeyByLabel(templateLabel);

    if (!templateKey || templateKey === 'theme_default') {
      showToastMessage(
        'error',
        f('configuration.theme.template_delete_error_default'),
      );
      return;
    }

    const themeToDelete = initialValues.find(
      (theme) => theme.name === templateKey,
    );

    if (!themeToDelete) {
      showToastMessage(
        'error',
        f('configuration.theme.template_not_found_error'),
      );
      return;
    }

    setTemplateToDelete(themeToDelete);
    setModalOpen(true);
  };

  const handleDeleteTemplateFromSAP = async (theme: ThemeConfig[]) => {
    try {
      await deleteThemeConfiguration(theme);
      showToastMessage(
        'success',
        f('configuration.theme.template_delete_success'),
      );
    } catch {
      showToastMessage(
        'error',
        f('configuration.theme.template_delete_error_sap'),
      );
    }
  };

  const handleDeleteClose = () => {
    setModalOpen(false);
    setTemplateToDelete(null);
  };

  const handleOk = async () => {
    if (!templateToDelete) return;

    await handleDeleteTemplateFromSAP([templateToDelete]);

    const updatedTemplates = allTemplates.filter(
      (t) => t.key !== templateToDelete.name,
    );
    setAllTemplates(updatedTemplates);

    const updatedInitialValues = initialValues.filter(
      (theme) => theme.name !== templateToDelete.name,
    );
    setInitialValues(updatedInitialValues);

    setTemplate('Default');
    changeTemplate('Default');

    setTemplateToDelete(null);
    setModalOpen(false);
  };

  return {
    template,
    allTemplates,
    modalOpen,
    getTemplateData,
    changeTemplate,
    handleTemplateDelete,
    handleDeleteClose,
    handleOk,
  };
}
