import { ChangeEvent, Dispatch, SetStateAction, useState } from 'react';
import { saveAs } from 'file-saver';
import { Banner, ThemeConfig } from 'types/ThemeConfig';
import { useEpayToast } from 'providers/EpayToastProvider';

import {
  dataUriToObjectUrl,
  ParsedThemeImport,
  parseThemeImportFile,
  serializeThemeExport,
  themeExportFileName,
  THEME_COLOR_FIELDS,
  THEME_IMPORT_MAX_FILE_BYTES,
  THEME_TEXT_FIELDS,
} from './themePortability';

interface UseThemePortabilityDeps {
  selectedTheme: ThemeConfig | undefined;
  setSelectedTheme: Dispatch<SetStateAction<ThemeConfig | undefined>>;
  setInitialValues: Dispatch<SetStateAction<ThemeConfig[]>>;
  template: string;
  banners: Banner[];
  setBanners: Dispatch<SetStateAction<Banner[]>>;
  selectedLanguage: string;
  bannerText1: string;
  setBannerText1: Dispatch<SetStateAction<string>>;
  bannerText2: string;
  setBannerText2: Dispatch<SetStateAction<string>>;
  logoData: string;
  setLogoData: Dispatch<SetStateAction<string>>;
  iconData: string;
  setIconData: Dispatch<SetStateAction<string>>;
  setLogo: Dispatch<SetStateAction<string | null>>;
  setIcon: Dispatch<SetStateAction<string | null>>;
  f: (id: string) => string;
}

function mergeBannerText(
  banners: Banner[],
  language: string,
  text1: string,
  text2: string,
): Banner[] {
  const merged = banners.map((banner) => ({ ...banner }));
  const index = merged.findIndex((banner) => banner.language === language);
  if (index >= 0) {
    merged[index] = { ...merged[index], text1, text2 };
  } else if (text1 || text2) {
    merged.push({ language, content: '', text1, text2 });
  }
  return merged;
}

export function useThemePortability({
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
}: UseThemePortabilityDeps) {
  const { showToastMessage } = useEpayToast();
  const [pendingImport, setPendingImport] = useState<ParsedThemeImport | null>(
    null,
  );

  // Exports what is on screen (including unsaved edits), composed the same
  // way Save composes the payload.
  const handleExport = () => {
    if (!selectedTheme) return;
    const snapshot: ThemeConfig = {
      ...selectedTheme,
      banners: mergeBannerText(
        banners,
        selectedLanguage,
        bannerText1,
        bannerText2,
      ),
      brandLogo: logoData,
      brandIcon: iconData,
    };
    const blob = new Blob([serializeThemeExport(snapshot)], {
      type: 'application/json',
    });
    saveAs(blob, themeExportFileName(template));
  };

  const handleImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so choosing the same file again still fires a change event.
    e.target.value = '';
    if (!file || !selectedTheme) return;
    if (file.size > THEME_IMPORT_MAX_FILE_BYTES) {
      showToastMessage('error', f('configuration.theme.import_invalid'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        // Nothing is applied yet — the confirm dialog gates the merge, and
        // nothing reaches SAP until Save Configuration.
        setPendingImport(parseThemeImportFile(reader.result as string));
      } catch {
        showToastMessage('error', f('configuration.theme.import_invalid'));
      }
    };
    reader.onerror = () => {
      showToastMessage('error', f('configuration.theme.import_invalid'));
    };
    reader.readAsText(file);
  };

  const cancelImport = () => setPendingImport(null);

  const confirmImport = () => {
    if (!pendingImport || !selectedTheme) return;
    const { values } = pendingImport;
    const updatedTheme: ThemeConfig = { ...selectedTheme };

    [...THEME_COLOR_FIELDS, ...THEME_TEXT_FIELDS].forEach((field) => {
      const value = values[field];
      if (value) {
        (updatedTheme as unknown as Record<string, string>)[field] = value;
      }
    });

    if (values.banners?.length) {
      // Merge per language — languages the file lacks keep their banners, and
      // empty imported fields keep the current values (the dialog says so).
      const merged = banners.map((banner) => ({ ...banner }));
      for (const imported of values.banners) {
        const index = merged.findIndex(
          (banner) => banner.language === imported.language,
        );
        if (index >= 0) {
          merged[index] = {
            ...merged[index],
            content: imported.content || merged[index].content,
            text1: imported.text1 ?? merged[index].text1,
            text2: imported.text2 ?? merged[index].text2,
          };
        } else {
          merged.push({ ...imported });
        }
      }
      updatedTheme.banners = merged;
      setBanners(merged);
      const importedCurrent = values.banners.find(
        (banner) => banner.language === selectedLanguage,
      );
      if (importedCurrent?.text1) setBannerText1(importedCurrent.text1);
      if (importedCurrent?.text2) setBannerText2(importedCurrent.text2);
    }

    if (values.brandLogo) {
      updatedTheme.brandLogo = values.brandLogo;
      setLogoData(values.brandLogo);
      // Preview via an object URL — the CSP blocks data: in img-src, and the
      // imported image has no saved wwwroot file yet.
      setLogo(dataUriToObjectUrl(values.brandLogo));
    }
    if (values.brandIcon) {
      updatedTheme.brandIcon = values.brandIcon;
      setIconData(values.brandIcon);
      setIcon(dataUriToObjectUrl(values.brandIcon));
    }

    setSelectedTheme(updatedTheme);
    // changeTemplate rebuilds from initialValues, so an import that lives only
    // in selectedTheme would silently revert on a template switch.
    setInitialValues((prev) =>
      prev.map((theme) =>
        theme.name === updatedTheme.name ? updatedTheme : theme,
      ),
    );
    setPendingImport(null);
    showToastMessage('success', f('configuration.theme.import_success'));
  };

  return {
    pendingImport,
    handleExport,
    handleImportFile,
    confirmImport,
    cancelImport,
  };
}
