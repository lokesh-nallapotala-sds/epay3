import {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  useEffect,
  useState,
} from 'react';
import { ThemeConfig } from 'types/ThemeConfig';

export function useThemeUrls(
  selectedTheme: ThemeConfig | undefined,
  setSelectedTheme: Dispatch<SetStateAction<ThemeConfig | undefined>>,
) {
  const [selectedURL, setSelectedURL] = useState('');
  const [selectedURLList, setSelectedURLList] = useState<string[]>([]);
  const [showURLGRID, setShowURLGRID] = useState(false);

  const getURLData = (data) => {
    const nextUrls = [...new Set([...(selectedTheme?.urls ?? []), data])];

    if (selectedTheme) {
      setSelectedTheme({
        ...selectedTheme,
        urls: nextUrls,
      });
    }

    setSelectedURL(data);
    setSelectedURLList(nextUrls);
  };

  const handleURLChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const newSelectedURL = event.target.value;
    setSelectedURL(newSelectedURL);
  };

  const handleURLDelete = (urlToDelete) => {
    const nextUrls = (selectedTheme?.urls ?? []).filter(
      (url) =>
        !(
          url === urlToDelete ||
          url.includes(urlToDelete) ||
          urlToDelete.includes(url)
        ),
    );

    setSelectedURLList(nextUrls);
    setSelectedURL(nextUrls[0] ?? '');

    if (selectedTheme) {
      setSelectedTheme({
        ...selectedTheme,
        urls: nextUrls,
      });
    }
  };

  useEffect(() => {
    if (selectedURLList.length > 0) {
      setSelectedURL(selectedURLList[0]);
    }
  }, [selectedURLList]);

  return {
    selectedURL,
    setSelectedURL,
    selectedURLList,
    setSelectedURLList,
    showURLGRID,
    setShowURLGRID,
    getURLData,
    handleURLChange,
    handleURLDelete,
  };
}
