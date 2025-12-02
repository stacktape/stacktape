type FetchOptions = {
  headers?: Record<string, any>;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: Record<string, any> | any[];
};

export const jsonFetch = (url: string, options?: FetchOptions): Promise<any> => {
  const { method = 'GET', headers = {}, body } = options || {};
  return global
    .fetch(url, {
      method,
      ...(body && { body: JSON.stringify(body) }),
      headers: { 'Content-Type': 'application/json', ...headers }
    })
    .then((response) => response.json())
    .then((res) => res);
};
