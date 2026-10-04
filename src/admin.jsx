import 'core-js/stable';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { getRegistrations } from './api';
import './admin.css';

const messengers = { phone: 'Звонок', telegram: 'Telegram', whatsapp: 'WhatsApp' };
function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Дата не указана' : date.toLocaleString('ru-RU');
}

function Admin() {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setResult(null);
    getRegistrations(page).then(data => {
      if (!active) return;
      const lastPage = Math.max(1, Math.ceil(data.total / data.pageSize));
      if (page > lastPage) { setPage(lastPage); return; }
      setResult(data);
    }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, revision]);
  const pages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;
  return <main className="admin"><header className="admin-header"><div><a className="admin-brand" href="/">ЛЕСНОЙ <span>↗</span></a><h1>Заявки на мероприятие</h1><p>Новые заявки сверху. Время показано в часовом поясе вашего устройства.</p></div><button className="admin-button" onClick={() => setRevision(v => v + 1)} disabled={loading}>{loading ? 'Загрузка…' : 'Обновить'}</button></header>
    <div className="admin-summary" role="status" aria-live="polite">{result ? `Всего заявок: ${result.total}` : loading ? 'Загружаем заявки…' : 'Данные не загружены'}</div>
    {error && <div className="admin-error" role="alert">{error}<button className="admin-button" onClick={() => setRevision(v => v + 1)}>Повторить</button></div>}
    {result && result.items.length === 0 && <div className="admin-empty"><h2>Заявок пока нет</h2><p>После отправки формы на лендинге они появятся здесь.</p><a href="/">Открыть лендинг ↗</a></div>}
    {result && result.items.length > 0 && <><div className="admin-list">{result.items.map(item => <article className="registration-card" key={item._id}><div className="card-header"><h2>{item.name}</h2><time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time></div><dl><div><dt>Телефон</dt><dd><a href={`tel:${item.phone}`}>{item.phone}</a></dd></div><div><dt>Способ связи</dt><dd>{messengers[item.messenger] || item.messenger || 'Не указан'}</dd></div><div><dt>Согласие на обработку</dt><dd>{item.consent ? 'Получено' : 'Не получено'}{item.consentVersion ? ` · версия ${item.consentVersion}` : ''}</dd></div><div><dt>Номер заявки</dt><dd className="registration-id">{item._id}</dd></div></dl></article>)}</div><nav className="admin-pagination" aria-label="Страницы заявок"><button className="admin-button" disabled={loading || page <= 1} onClick={() => setPage(v => v - 1)}>← Назад</button><span>Страница {page} из {pages}</span><button className="admin-button" disabled={loading || page >= pages} onClick={() => setPage(v => v + 1)}>Далее →</button></nav></>}
  </main>;
}

ReactDOM.render(<Admin />, document.getElementById('root'));
