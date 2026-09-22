import { ChangeEvent, useEffect, useState } from 'react';

import { useAppSelector } from 'redux/hooks';
import { languageSelector } from 'redux/reducers';
import { TitleMap } from 'constants/EmailTemplates';
import { EpayApplicationService } from 'services/EpayApplicationService';

import {
  EmailConfig,
  EmailTemplate,
} from 'components/settings/configuration/EmailConfig';

export function useEmailTemplates() {
  const [selectedKey, setSelectedKey] = useState<string>(
    'welcome_email_content',
  );
  const [currentEmailConfig, setCurrentEmailConfig] = useState<EmailConfig>({
    isEnabled: true,
    key: selectedKey,
    templates: {},
  });

  const selectedLanguage = useAppSelector(languageSelector);

  const [emailTemplate, setEmailTemplate] = useState<EmailTemplate>({
    email: '',
    language: selectedLanguage,
    title: '',
    template: '',
  });

  const [templateLanguageValue, settemplateLanguageValue] =
    useState<string>(selectedLanguage);

  const [emailSubjectError, setEmailSubjectError] = useState<string>('');

  const getEmailConfig = EpayApplicationService.useGetEmailConfig();
  const getDefaultEmailTemplate =
    EpayApplicationService.useGetDefaultEmailTemplate();

  function handleEmailSubject(event: ChangeEvent<HTMLInputElement>) {
    const s = event.target.value;
    if (s.length > 0) setEmailSubjectError('');
    setEmailTemplate({ ...emailTemplate, title: event.target.value });
  }

  function handleTemplateType(event: ChangeEvent<HTMLInputElement>) {
    const s = event.target.value;
    setEmailTemplate({ ...emailTemplate, template: s });
    setSelectedKey(s);
  }

  function handleTemplateLanguage(event: ChangeEvent<HTMLInputElement>) {
    const s = event.target.value;
    setEmailTemplate({ ...emailTemplate, language: s });
    settemplateLanguageValue(s);
  }

  const handleEditorChange = (value: string) => {
    setEmailTemplate((prev) => ({ ...prev, email: value }));
  };

  const applyDefaultTemplate = async () => {
    try {
      const defaultResp = await getDefaultEmailTemplate(
        selectedKey,
        templateLanguageValue,
      );

      setEmailTemplate({
        title: TitleMap[selectedKey] ?? '',
        language: templateLanguageValue,
        email: defaultResp.html,
        template: selectedKey,
      });
    } catch {
      setEmailTemplate({
        title: '',
        language: templateLanguageValue,
        email: '',
        template: selectedKey,
      });
    }
  };

  const handleResetToDefault = async () => {
    await applyDefaultTemplate();
  };

  useEffect(() => {
    fetchEmailConfigData();
  }, [selectedKey, templateLanguageValue]);

  const fetchEmailConfigData = async () => {
    getEmailConfig(selectedKey).then(async (resp: EmailConfig) => {
      setCurrentEmailConfig(resp);
      if (resp.templates[templateLanguageValue]) {
        setEmailTemplate(resp.templates[templateLanguageValue]);
      } else {
        await applyDefaultTemplate();
      }
    });
  };

  return {
    selectedKey,
    currentEmailConfig,
    emailTemplate,
    templateLanguageValue,
    emailSubjectError,
    setEmailSubjectError,
    handleEmailSubject,
    handleTemplateType,
    handleTemplateLanguage,
    handleEditorChange,
    handleResetToDefault,
  };
}
