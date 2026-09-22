export async function loadLocaleMessages(
  lang: string,
): Promise<Record<string, string>> {
  const resp = await fetch(`api/config/language/${lang}`);
  if (!resp.ok) throw new Error(`Failed to load messages for ${lang}`);
  return resp.json();
}
