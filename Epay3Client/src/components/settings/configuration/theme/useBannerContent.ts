import { ChangeEvent, useState } from 'react';
import { Banner } from 'types/ThemeConfig';

export function useBannerContent() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [selectedLanguageError, setSelectedLanguageError] = useState('');
  const [bannerText1, setBannerText1] = useState('');
  const [bannerText2, setBannerText2] = useState('');

  const handleBannerLanguage = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const lang = event.target.value;
    const currentBanner = banners.find((x) => x.language === lang);
    if (currentBanner) {
      setBannerText1(currentBanner.text1 || '');
      setBannerText2(currentBanner.text2 || '');
      setSelectedLanguageError('');
    } else {
      setBannerText1('');
      setBannerText2('');
    }
    setSelectedLanguage(lang);
  };

  const handleBannerText1Change = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const index = banners.findIndex((x) => x.language === selectedLanguage);
    const allBanners = [...banners];
    if (index >= 0) {
      allBanners[index] = { ...allBanners[index], text1: value };
    } else {
      allBanners.push({
        language: selectedLanguage,
        content: '',
        text1: value,
        text2: bannerText2,
      });
    }
    setBanners(allBanners);
    setBannerText1(value);
  };

  const handleBannerText2Change = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const index = banners.findIndex((x) => x.language === selectedLanguage);
    const allBanners = [...banners];
    if (index >= 0) {
      allBanners[index] = { ...allBanners[index], text2: value };
    } else {
      allBanners.push({
        language: selectedLanguage,
        content: '',
        text1: bannerText1,
        text2: value,
      });
    }
    setBanners(allBanners);
    setBannerText2(value);
  };

  return {
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
  };
}
