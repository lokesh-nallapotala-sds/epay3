import { useIntl } from 'react-intl';

export function useFormat() {
  const intl = useIntl();
  return (id: string) => intl.formatMessage({ id, defaultMessage: id });
}
