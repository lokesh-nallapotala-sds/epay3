import { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useAppDispatch } from 'redux/hooks';
import { setDomainTheme } from 'redux/reducers';
import { Banner, ThemeConfig } from 'types/ThemeConfig';
import { useEpayToast } from 'providers/EpayToastProvider';
import { EpayThemeConfigurationService } from 'services/EpayThemeConfigurationService';

import {
  defaultBannerColor,
  defaultBannerText1,
  defaultBannerText2,
} from './themeDefaults';

interface UseThemeSaveDeps {
  selectedTheme: ThemeConfig | undefined;
  setSelectedTheme: Dispatch<SetStateAction<ThemeConfig | undefined>>;
  initialValues: ThemeConfig[];
  setInitialValues: Dispatch<SetStateAction<ThemeConfig[]>>;
  banners: Banner[];
  setBanners: Dispatch<SetStateAction<Banner[]>>;
  selectedLanguage: string;
  bannerText1: string;
  setBannerText1: Dispatch<SetStateAction<string>>;
  bannerText2: string;
  setBannerText2: Dispatch<SetStateAction<string>>;
  logo: string | null;
  setLogo: Dispatch<SetStateAction<string | null>>;
  logoData: string;
  setLogoData: Dispatch<SetStateAction<string>>;
  icon: string | null;
  setIcon: Dispatch<SetStateAction<string | null>>;
  iconData: string;
  setIconData: Dispatch<SetStateAction<string>>;
  logoRef: MutableRefObject<HTMLDivElement | null>;
  f: (id: string) => string;
}

export function useThemeSave({
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
}: UseThemeSaveDeps) {
  const updateThemeConfiguration =
    EpayThemeConfigurationService.useUpdatedThemeConfiguration();
  const { showToastMessage } = useEpayToast();
  const dispatch = useAppDispatch();

  const handleSubmit = () => {
    if (selectedTheme) {
      const requiredFields = [
        { field: selectedTheme.brandTitle, name: 'brandTitle' },
        { field: selectedTheme.applicationName, name: 'applicationName' },
      ];

      const emptyField = requiredFields.find(({ field }) => !field?.trim());
      if (emptyField) {
        document
          .querySelector(`input[name="${emptyField.name}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      const colorFields = [
        { field: selectedTheme.backgroundColor, name: 'backgroundColor' },
        {
          field: selectedTheme.headerBackgroundColor,
          name: 'headerBackgroundColor',
        },
        { field: selectedTheme.primaryColor, name: 'primaryColor' },
        { field: selectedTheme.contrastColor, name: 'contrastColor' },
        { field: selectedTheme.hoverColor, name: 'hoverColor' },
        { field: selectedTheme.buttonColor, name: 'buttonColor' },
        { field: selectedTheme.buttonTextColor, name: 'buttonTextColor' },
        { field: selectedTheme.buttonHoverColor, name: 'buttonHoverColor' },
        {
          field: selectedTheme.buttonHoverTextColor,
          name: 'buttonHoverTextColor',
        },
        { field: selectedTheme.highlightColor, name: 'highlightColor' },
        { field: selectedTheme.bannerColor, name: 'bannerColor' },
      ];

      const isValidHex = (value: string) => /^#([0-9A-Fa-f]{6})$/.test(value);
      const invalidColorField = colorFields.find(
        ({ field }) => field && !isValidHex(field),
      );
      if (invalidColorField) {
        document
          .querySelector(`input[name="${invalidColorField.name}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      if (
        (!logoData && logo !== 'logo.png') ||
        (!iconData && icon !== 'favicon.ico')
      ) {
        logoRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        return;
      }
      const updatedBanners = banners.map((banner) => ({ ...banner }));
      const selectedBannerIndex = updatedBanners.findIndex(
        (banner) => banner.language === selectedLanguage,
      );
      if (selectedBannerIndex >= 0) {
        updatedBanners[selectedBannerIndex] = {
          ...updatedBanners[selectedBannerIndex],
          text1: bannerText1,
          text2: bannerText2,
        };
      } else {
        updatedBanners.push({
          language: selectedLanguage,
          content: '',
          text1: bannerText1,
          text2: bannerText2,
        });
      }

      const updatedTheme: ThemeConfig = {
        ...selectedTheme,
        banners: updatedBanners,
        brandLogo: logoData,
        brandIcon: iconData,
      };
      const updatedInitialValues = initialValues.map((theme) =>
        theme.name === updatedTheme.name ? updatedTheme : theme,
      );

      setBanners(updatedBanners);
      setInitialValues(updatedInitialValues);
      setSelectedTheme(updatedTheme);
      dispatch(setDomainTheme(updatedTheme));

      updateThemeConfiguration([updatedTheme])
        .then(() => {
          showToastMessage('success', f('configuration.theme.save_success'));
        })
        .catch(() => {
          showToastMessage('error', f('configuration.theme.save_error'));
        });
    }
  };

  const handleReset = () => {
    const index = banners.findIndex((x) => x.language === selectedLanguage);
    const allBanners = [...banners];
    if (index >= 0) {
      allBanners[index] = {
        ...allBanners[index],
        text1: defaultBannerText1,
        text2: defaultBannerText2,
      };
    } else {
      allBanners.push({
        language: selectedLanguage,
        content: '',
        text1: defaultBannerText1,
        text2: defaultBannerText2,
      });
    }

    setBanners(allBanners);
    setBannerText1(defaultBannerText1);
    setBannerText2(defaultBannerText2);
    setLogo('logo.png');
    setLogoData('');
    setIcon('favicon.ico');
    setIconData('');
    if (selectedTheme) {
      const resetTheme = {
        ...selectedTheme,
        banners: allBanners,
        bannerColor: defaultBannerColor,
        brandLogo: '',
        brandIcon: '',
      };
      setSelectedTheme(resetTheme);
      dispatch(setDomainTheme(resetTheme));

      const updatedInitialValues = initialValues.map((theme) =>
        theme.name === resetTheme.name ? resetTheme : theme,
      );
      setInitialValues(updatedInitialValues);

      updateThemeConfiguration([resetTheme])
        .then(() => {
          showToastMessage('success', f('configuration.theme.save_success'));
        })
        .catch(() => {
          showToastMessage('error', f('configuration.theme.save_error'));
        });
    }
  };

  return { handleSubmit, handleReset };
}
