import { useCallback } from 'react';
import { useEpayLocale } from '../providers/EpayIntlProvider.tsx';
import { handleMaintenanceHttpResponse } from '../utilities/maintenance';

export function useFetchWithLang(): typeof fetch {
  const { language } = useEpayLocale();

  return useCallback<typeof fetch>(
    async (input, init) => {
      let url: URL;
      if (typeof input === 'string') {
        url = new URL(input, window.location.origin);
      } else if (input instanceof URL) {
        url = new URL(input.toString(), window.location.origin);
      } else {
        url = new URL(input.url, window.location.origin);
      }

      url.searchParams.set('lang', language);
      let response: Response;
      // If it was a Request, rebuild it
      if (input instanceof Request) {
        const req = new Request(url.toString(), input);
        response = await window.fetch(req, init);
      } else {
        // Otherwise, call window.fetch on the new URL
        response = await window.fetch(url.toString(), init);
      }

      // Maintenance safety net: any 401/403/503 carrying a maintenance
      // payload triggers the canonical redirect handling.
      await handleMaintenanceHttpResponse(response);
      return response;
    },
    [language],
  );
}
