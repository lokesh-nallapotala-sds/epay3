export interface Banner {
  language: string;
  content: string;
  text1?: string;
  text2?: string;
}

export interface ThemeConfig {
  name: string;
  urls: string[];
  banners: Banner[];
  bannerColor?: string;
  brandLogo: string;
  brandIcon: string;
  brandTitle: string;
  backgroundColor: string;
  headerBackgroundColor: string;
  primaryColor: string;
  contrastColor: string;
  hoverColor: string;
  buttonColor: string;
  buttonTextColor: string;
  buttonHoverColor: string;
  buttonHoverTextColor: string;
  buttonBorderColor: string;
  buttonBorderHoverColor: string;
  highlightColor: string;
  applicationName: string;
}
