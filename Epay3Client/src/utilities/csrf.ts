let csrfToken: string | null = null;
let csrfTokenAuthKey: string | null = null;
let csrfTokenPromise: Promise<string | null> | null = null;
let csrfTokenPromiseAuthKey: string | null = null;

export async function getCsrfToken(
  forceRefresh = false,
): Promise<string | null> {
  const authKey = 'cookie-session';

  if (!forceRefresh && csrfToken && csrfTokenAuthKey === authKey) {
    return csrfToken;
  }

  if (
    !forceRefresh &&
    csrfTokenPromise &&
    csrfTokenPromiseAuthKey === authKey
  ) {
    return csrfTokenPromise;
  }

  csrfTokenPromiseAuthKey = authKey;
  csrfTokenPromise = fetch('/api/csrf/token', {
    method: 'GET',
    credentials: 'include',
  })
    .then(async (response) => {
      if (!response.ok) {
        return null;
      }

      const body: { token?: string } = await response.json();
      csrfToken = body.token ?? null;
      csrfTokenAuthKey = authKey;
      return csrfToken;
    })
    .catch(() => {
      csrfToken = null;
      csrfTokenAuthKey = null;
      return null;
    })
    .finally(() => {
      csrfTokenPromise = null;
      csrfTokenPromiseAuthKey = null;
    });

  return csrfTokenPromise;
}

export async function getCsrfHeaders(): Promise<HeadersInit> {
  const token = await getCsrfToken();
  return token ? { 'X-CSRF-Token': token } : {};
}
