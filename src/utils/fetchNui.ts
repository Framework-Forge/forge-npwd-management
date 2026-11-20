const RESOURCE_NAME = 'forge-npwd-management';

export async function fetchNui<TResponse, TData = unknown>(
  event: string,
  data?: TData
): Promise<TResponse> {
  const isEnvBrowser = !window.invokeNative && !('GetParentResourceName' in window);

  if (isEnvBrowser) {
    console.debug(`[MOCK fetchNui] Event: ${event}`, data);
    return Promise.resolve({ status: 'ok', mock: true } as unknown as TResponse);
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`https://${RESOURCE_NAME}/${event}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(data ?? {}),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Falha na resposta NUI (${response.status})`);
    }

    return (await response.json()) as TResponse;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('A requisição NUI demorou demais.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
