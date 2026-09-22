import { ThemeConfig } from 'types/ThemeConfig';

export const defaultBannerText1 = "Let's empower your customers today.";
export const defaultBannerText2 =
  'With ChronarPay, you can view and pay your invoices conveniently from anywhere.';
export const defaultBannerColor = '#001644';

export const createDefaultTheme = (name: string): ThemeConfig => ({
  name,
  urls: [],
  banners: [],
  bannerColor: defaultBannerColor,
  brandLogo: '',
  brandIcon: '',
  brandTitle: '',
  backgroundColor: '#FFFFFF',
  headerBackgroundColor: '#FFFFFF',
  primaryColor: '#FFFFFF',
  contrastColor: '#FFFFFF',
  hoverColor: '#FFFFFF',
  buttonColor: '#FFFFFF',
  buttonTextColor: '#FFFFFF',
  buttonHoverColor: '#FFFFFF',
  buttonHoverTextColor: '#FFFFFF',
  buttonBorderColor: '#FFFFFF',
  buttonBorderHoverColor: '#FFFFFF',
  highlightColor: '#FFFFFF',
  applicationName: '',
});
