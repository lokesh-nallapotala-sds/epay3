import { useRef, useState } from 'react';

export function useThemeBranding() {
  const [logoData, setLogoData] = useState<string>('');
  const [iconData, setIconData] = useState<string>('');
  const [logo, setLogo] = useState<string | null>(null);
  const [icon, setIcon] = useState<string | null>(null);
  const logoRef = useRef<HTMLDivElement | null>(null);
  const iconRef = useRef<HTMLDivElement | null>(null);

  const handleIconDataChange = (data: string) => {
    setIconData(data);
  };

  const handleLogoDataChange = (data: string) => {
    setLogoData(data);
  };

  return {
    logoData,
    setLogoData,
    iconData,
    setIconData,
    logo,
    setLogo,
    icon,
    setIcon,
    logoRef,
    iconRef,
    handleIconDataChange,
    handleLogoDataChange,
  };
}
