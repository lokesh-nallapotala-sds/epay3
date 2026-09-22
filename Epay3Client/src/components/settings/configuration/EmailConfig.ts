export interface EmailConfig {
  isEnabled: boolean;
  key: string;
  templates: { [key: string]: EmailTemplate };
}

export interface EmailTemplate {
  language: string;
  email: string;
  title: string;
  template: string;
}

export function createEmailConfig(key: string): EmailConfig {
  return {
    isEnabled: true,
    key,
    templates: {},
  };
}
