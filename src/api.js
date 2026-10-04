function requestJson(method, url, values) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(method, url);
    if (values !== undefined) request.setRequestHeader('Content-Type', 'application/json');
    request.timeout = 15000;
    request.onload = () => {
      try {
        const data = JSON.parse(request.responseText);
        if (request.status >= 200 && request.status < 300) resolve(data);
        else reject(new Error(data.error || 'Не удалось выполнить запрос. Попробуйте позже.'));
      } catch (_) { reject(new Error('Сервер вернул некорректный ответ. Попробуйте позже.')); }
    };
    request.onerror = () => reject(new Error('Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.'));
    request.ontimeout = () => reject(new Error('Сервер не ответил вовремя. Попробуйте ещё раз.'));
    request.send(values === undefined ? null : JSON.stringify(values));
  });
}

export function register(values) { return requestJson('POST', '/api/registrations', values); }
export function getRegistrations(page) { return requestJson('GET', `/api/admin/registrations?page=${page}`); }
