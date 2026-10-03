export const toResponseError = async (response: Response, fallbackMessage: string) => {
  const body = await response.json().catch(() => null);

  return Object.assign(new Error(body?.error?.message ?? fallbackMessage), {
    status: response.status,
    code: body?.error?.code,
  });
};
