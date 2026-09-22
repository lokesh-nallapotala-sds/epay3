import { ErrorInfo } from 'types/ErrorInfo';

export async function createErrorInfoFromResponse(
  response: Response,
): Promise<ErrorInfo> {
  const data = await readResponseData(response);
  const objectData =
    data && typeof data === 'object'
      ? (data as { message?: string; code?: string })
      : null;
  const message =
    typeof data === 'string'
      ? data
      : objectData?.message ||
        objectData?.code ||
        response.statusText ||
        'Request failed';

  return new ErrorInfo(message, response.statusText, response.status, data);
}

async function readResponseData(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    const text = await response.text();
    return text || null;
  } catch {
    return null;
  }
}
