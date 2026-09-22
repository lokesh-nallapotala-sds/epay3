import { useEffect, useState } from 'react';

import styled from '@emotion/styled';
import { useAppSelector } from 'redux/hooks';
import { domainThemeSelector } from 'redux/reducers';
import { checkFileExists } from 'utilities/utilities';

const CompanyLogoImage = styled('img')(() => ({
  width: 160,
}));

function AppLogo() {
  const theme = useAppSelector(domainThemeSelector);

  const [fileLogo, setFileLogo] = useState<string | null>(null);

  useEffect(() => {
    const updateCompanyLogo = async () => {
      if (!theme.name) {
        setFileLogo(null);
        return;
      }

      if (!theme.brandLogo) {
        setFileLogo('logo.png');
        return;
      }

      let template = theme.name.substring(theme.name.indexOf('_') + 1);
      if (!template) {
        template = 'default';
      }

      let filePath = `${template}/logo.png`;
      const fileExists = await checkFileExists(filePath);
      if (!fileExists) {
        filePath = 'logo.png';
      }
      setFileLogo(filePath);
    };

    updateCompanyLogo();
  }, [theme]);

  return <>{fileLogo && <CompanyLogoImage src={fileLogo} alt="logo" />}</>;
}
export default AppLogo;
