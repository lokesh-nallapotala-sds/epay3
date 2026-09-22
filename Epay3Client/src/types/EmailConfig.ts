export interface EmailConfig {
  isEnabled: boolean;
  key: string;
  templates: { [key: string]: EmailTemplate };
}
export interface EmailTemplateCheckResponse {
  hasMissingTemplates: boolean;
  message: string;
}
export interface EmailTemplate {
  language: string;
  email: string;
  title: string;
  template: string;
}
