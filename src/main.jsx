import 'core-js/stable';
import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { event, schedule } from './content';
import { register } from './api';
import hero from './assets/hero.jpg';
import house from './assets/house.jpg';
import interior from './assets/interior.jpg';
import nature from './assets/nature.jpg';
import './styles.css';

function Icon({ type = 'arrow', ...props }) {
  const paths = {
    arrow: 'M4 12h16M14 6l6 6-6 6',
    pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1116 0z M15 10a3 3 0 11-6 0 3 3 0 016 0',
    clock: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0 M12 7v5l3 2',
    house: 'M3 11l9-8 9 8 M5 10v11h14V10 M9 21v-8h6v8',
    leaf: 'M20 3C6 2 2 9 6 16c7 5 15-1 14-13z M4 21L16 9',
    check: 'M5 12l4 4L19 6',
    menu: 'M4 7h16M4 12h16M4 17h16',
    close: 'M6 6l12 12M6 18L18 6',
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[type]} /></svg>;
}

function Logo({ footer = false }) {
  return <a className={`logo ${footer ? 'logo-footer' : ''}`} href="#home" aria-label="Лесной — на главную"><span className="logo-symbol"><svg viewBox="0 0 42 42" fill="none" aria-hidden="true"><path d="M7 33L21 7l14 26M13 33l8-15 8 15M21 26v12" stroke="currentColor" strokeWidth="1.4" /></svg></span><span>ЛЕСНОЙ<small>КОТТЕДЖНЫЙ ПОСЁЛОК</small></span></a>;
}

function CTA({ children = 'Записаться на день открытых дверей', className = '' }) {
  return <a className={`button ${className}`} href="#registration">{children}<Icon /></a>;
}

function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef(null);
  useEffect(() => {
    const onScroll = () => setScrolled(window.pageYOffset > 36);
    const onKey = e => { if (e.key === 'Escape') { setOpen(false); if (toggleRef.current) toggleRef.current.focus(); } };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('keydown', onKey); };
  }, []);
  return <header className={`header ${scrolled || open ? 'header-solid' : ''}`}>
    <div className="header-inner"><Logo /><nav aria-label="Главное меню" id="navigation" className={open ? 'navigation navigation-open' : 'navigation'}>
      {[['about', 'О мероприятии'], ['program', 'Программа'], ['location', 'Локация'], ['registration', 'Контакты']].map(([id, label]) => <a key={id} href={`#${id}`} onClick={() => setOpen(false)}>{label}</a>)}
    </nav><a className="header-date" href="#program">{event.date}<span>День открытых дверей</span></a>
    <button ref={toggleRef} className="menu-toggle" aria-label={open ? 'Закрыть меню' : 'Открыть меню'} aria-expanded={open} aria-controls="navigation" onClick={() => setOpen(!open)}><Icon type={open ? 'close' : 'menu'} /></button></div>
  </header>;
}

function Registration() {
  const [values, setValues] = useState({ name: '', phone: '', messenger: 'phone', consent: false, website: '' });
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');
  const [policy, setPolicy] = useState(false);
  const noticeRef = useRef(null);
  const policyButton = useRef(null);
  const closeButton = useRef(null);
  const modalRef = useRef(null);
  useEffect(() => { if ((state === 'success' || state === 'error') && noticeRef.current) noticeRef.current.focus(); }, [state]);
  useEffect(() => {
    if (!policy) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (closeButton.current) closeButton.current.focus();
    const close = () => { setPolicy(false); if (policyButton.current) policyButton.current.focus(); };
    const key = e => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        const items = modalRef.current.querySelectorAll('button, a[href]');
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', key); };
  }, [policy]);
  const change = e => { const { name, value, checked, type } = e.target; setValues(v => ({ ...v, [name]: type === 'checkbox' ? checked : value })); };
  const submit = async e => {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending'); setError('');
    try {
      await register(values);
      setState('success');
    } catch (err) { setError(err.message); setState('error'); }
  };
  const closePolicy = () => { setPolicy(false); if (policyButton.current) policyButton.current.focus(); };
  return <section className="registration section" id="registration" aria-labelledby="registration-title">
    <div className="container registration-layout"><div className="registration-copy"><span className="eyebrow light">05 / ДАВАЙТЕ ЗНАКОМИТЬСЯ</span><h2 id="registration-title">Лучше один раз<br />почувствовать.</h2><p>Приезжайте, чтобы увидеть свой будущий дом и понять, подходит ли вам жизнь здесь.</p><div className="registration-details"><div><Icon type="clock" /><span>{event.date}<small>{event.time}</small></span></div><div><Icon type="pin" /><span>{event.name}<small>{event.address}</small></span></div></div><div className="contact-note">Есть вопросы о мероприятии?<br /><span className="contact-phone">{event.phone}</span><br /><span>{event.email}</span><br /><small>Демонстрационные контакты</small></div></div>
    <div className="form-card">{state === 'success' ? <div className="success-state" ref={noticeRef} tabIndex="-1" role="status"><span className="success-icon"><Icon type="check" /></span><span className="eyebrow">ДО ВСТРЕЧИ</span><h3>Ваша заявка принята</h3><p>Спасибо за интерес к «Лесному». Мы сохранили ваши контакты.</p>{event.demo && <p className="demo-form-note">Это демонстрационный лендинг. Реальное мероприятие и обратный звонок пока не организованы.</p>}<button className="text-button" onClick={() => { setValues({ name: '', phone: '', messenger: 'phone', consent: false, website: '' }); setState('idle'); }}>Заполнить ещё одну заявку <span>↗</span></button></div> : <form onSubmit={submit}>
      <span className="form-overline">ВАШЕ ЗНАКОМСТВО С ЛЕСНЫМ</span><h3>Забронируйте место</h3><p className="form-intro">Оставьте контакты для подтверждения записи.</p>
      <label className="field">Ваше имя<input name="name" value={values.name} onChange={change} placeholder="Как к вам обращаться?" autoComplete="given-name" minLength={2} maxLength={80} required disabled={state === 'sending'} /></label>
      <label className="field">Номер телефона<input type="tel" name="phone" value={values.phone} onChange={change} placeholder="+7 (___) ___-__-__" autoComplete="tel" maxLength={32} pattern="[+0-9 ()\-]{10,32}" required disabled={state === 'sending'} /></label>
      <fieldset className="messengers" disabled={state === 'sending'}><legend>Как удобнее связаться?</legend>{[['phone', 'Звонок'], ['telegram', 'Telegram'], ['whatsapp', 'WhatsApp']].map(([value, label]) => <label key={value} className={values.messenger === value ? 'messenger selected' : 'messenger'}><input type="radio" name="messenger" value={value} checked={values.messenger === value} onChange={change} /><span>{label}</span></label>)}</fieldset>
      <div className="honeypot" aria-hidden="true"><label>Website<input name="website" value={values.website} onChange={change} tabIndex="-1" autoComplete="off" /></label></div>
      <label className="consent"><input type="checkbox" name="consent" checked={values.consent} onChange={change} required disabled={state === 'sending'} /><span>Я согласен на обработку персональных данных согласно <button ref={policyButton} className="policy-link" type="button" onClick={() => setPolicy(true)}>политике конфиденциальности</button></span></label>
      {state === 'error' && <p className="form-error" ref={noticeRef} tabIndex="-1" role="alert">{error}</p>}
      <button className="button form-submit" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Сохраняем заявку…' : 'Забронировать место'}<Icon /></button><div className="form-footnote"><span className="status-dot" />Количество мест ограничено</div>
      {event.demo && <p className="demo-form-note">Демонстрационная запись: данные мероприятия предварительные.</p>}
    </form>}</div></div>
    <footer className="footer container"><Logo footer /><span>Ближе к природе. Ближе к себе.</span><span>© {new Date().getFullYear()} Лесной · Демонстрационный проект</span></footer>
    {policy && <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) closePolicy(); }}><div className="policy-modal" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="policy-title"><button ref={closeButton} className="modal-close" onClick={closePolicy} aria-label="Закрыть политику"><Icon type="close" /></button><span className="eyebrow">ПЕРСОНАЛЬНЫЕ ДАННЫЕ</span><h3 id="policy-title">О форме записи</h3><p>Форма сохраняет имя, телефон, выбранный способ связи, дату заявки и согласие на обработку данных. Цель — регистрация и связь по поводу мероприятия. Контакты не отображаются на сайте публично.</p><p>Данные хранятся на сервере проекта. Рекламные рассылки форма не подключает.</p><p>Сейчас это демонстрационный проект. До публичного запуска необходимо указать юридическое наименование оператора, контакты для отзыва согласия, срок хранения и окончательную политику обработки данных.</p><button className="text-button" onClick={closePolicy}>Понятно <span>↗</span></button></div></div>}
  </section>;
}

function App() {
  return <><a className="skip-link" href="#about">Перейти к содержимому</a><Header /><main>
    <section className="hero" id="home" aria-labelledby="hero-title"><img className="hero-image" src={hero} alt="Современный загородный дом с панорамными окнами" fetchPriority="high" /><div className="hero-shade" /><div className="container hero-content"><div className="hero-label"><span className="status-dot" />ДЕНЬ ОТКРЫТЫХ ДВЕРЕЙ <span className="hero-label-divider" />{event.date}</div><h1 id="hero-title">Место, где<br />хочется <em>жить.</em></h1><p>Один день за городом — чтобы увидеть дома,<br className="desktop-break" /> познакомиться с посёлком и почувствовать себя дома.</p><div className="hero-actions"><CTA /><a className="secondary-link" href="#program">Посмотреть программу <span>↗</span></a></div></div><div className="hero-bottom container"><span>ПРИРОДА. АРХИТЕКТУРА. ВАША НОВАЯ ЖИЗНЬ.</span><a href="#about" aria-label="Перейти к информации о мероприятии">Листайте вниз <span>↓</span></a></div></section>
    <section className="about section" id="about" aria-labelledby="about-title"><div className="container"><div className="visit-strip"><div><span className="strip-icon"><Icon type="clock" /></span><span><small>КОГДА ВСТРЕЧАЕМСЯ</small><strong>{event.date}, {event.time}</strong></span></div><div><span className="strip-icon"><Icon type="pin" /></span><span><small>ГДЕ ВСТРЕЧАЕМСЯ</small><strong>Посёлок «Лесной»</strong></span></div><div><span className="strip-icon"><Icon type="leaf" /></span><span><small>КАК УЧАСТВОВАТЬ</small><strong>Бесплатно, по записи</strong></span></div></div>
    <div className="section-heading about-heading"><span className="eyebrow">02 / О МЕРОПРИЯТИИ</span><h2 id="about-title">Не просто посмотреть дом.<br /><span className="muted-heading">Представить свою жизнь в нём.</span></h2><p>Фотографии не передают тишину, запах леса и свет в гостиной. Поэтому мы приглашаем вас в гости — без спешки, с семьёй и с любыми вопросами.</p></div>
    <div className="experience-layout"><div className="experience-photo"><img src={interior} alt="Светлая гостиная с естественными материалами" loading="lazy" /><div className="photo-caption"><span>Пространство для вашей жизни</span><small>Свет. Тепло. Простые радости.</small></div><span className="photo-index">01 — 03</span></div><div className="benefits"><article className="benefit"><span className="benefit-number">01</span><div><h3>Почувствуйте место</h3><p>Прогуляйтесь по территории, оцените окружение и представьте свой обычный день здесь.</p></div><Icon type="leaf" /></article><article className="benefit"><span className="benefit-number">02</span><div><h3>Рассмотрите всё в деталях</h3><p>Посмотрите планировки, отделку и качество строительства вживую, а не на картинке.</p></div><Icon type="house" /></article><article className="benefit"><span className="benefit-number">03</span><div><h3>Поговорите напрямую</h3><p>Задайте вопросы архитектору и команде. Разберитесь в выборе дома и условиях покупки.</p></div><Icon type="check" /></article><div className="family-note"><span>Можно всей семьёй</span><p>Будем рады познакомиться с каждым, кто будет жить в вашем будущем доме.</p></div></div></div>
    <div className="image-pair"><figure><img src={house} alt="Архитектура современного дома" loading="lazy" /><figcaption>Архитектура, которая остаётся актуальной</figcaption></figure><figure><img src={nature} alt="Солнечный свет среди деревьев" loading="lazy" /><figcaption>Природа, которая становится частью дня</figcaption></figure></div></div></section>
    <section className="program section" id="program" aria-labelledby="program-title"><div className="container"><div className="program-heading"><div><span className="eyebrow">03 / ПРОГРАММА ДНЯ</span><h2 id="program-title">Хороший день.<br />Во всех деталях.</h2></div><p>Мы всё продумали, чтобы у вас осталось время и для вопросов, и для впечатлений.<span className="date-pill">{event.date} · {event.time}</span></p></div><div className="program-layout"><div className="timeline">{schedule.map((item, i) => <article className="timeline-row" key={item.time}><div className="timeline-time">{item.time}<span className={i === 0 ? 'timeline-dot active' : 'timeline-dot'} /></div><div className="timeline-content"><span className="timeline-tag">{item.tag}</span><h3>{item.title}</h3><p>{item.text}</p></div></article>)}</div><aside className="program-aside"><div className="aside-photo"><img src={hero} alt="Дом, с которым можно познакомиться на экскурсии" loading="lazy" /><span>ВАШ ДЕНЬ В ЛЕСНОМ</span></div><div className="experts-card"><span className="eyebrow">С ВАМИ БУДЕТ КОМАНДА</span><h3>Люди, которые<br />знают каждый дом</h3><div className="expert"><span className="expert-avatar">АМ</span><span>Александр Миронов<small>Архитектор · планировки и материалы</small></span></div><div className="expert"><span className="expert-avatar">ЕС</span><span>Елена Соколова<small>Руководитель проекта · жизнь в посёлке</small></span></div><p className="expert-note">Демонстрационный состав команды.</p></div></aside></div><div className="program-cta"><div><h3>Ваш будущий дом начинается со знакомства</h3><p>Участие бесплатное. Количество мест ограничено.</p></div><CTA /></div></div></section>
    <section className="location section" id="location" aria-labelledby="location-title"><div className="container"><div className="section-heading"><span className="eyebrow">04 / ЛОКАЦИЯ</span><h2 id="location-title">За городом.<br /><span className="muted-heading">Ближе, чем кажется.</span></h2></div><div className="location-layout"><div className="location-visual"><img src={nature} alt="Зелёное окружение загородного посёлка" loading="lazy" /><div className="location-marker"><Icon type="pin" /><span>ЛЕСНОЙ<small>Место нашей встречи</small></span></div><span className="location-image-note">ПРИРОДА ВМЕСТО ГОРОДСКОГО ШУМА</span></div><div className="location-card"><span className="eyebrow">ВСТРЕТИМСЯ ЗДЕСЬ</span><h3>Коттеджный посёлок<br />«Лесной»</h3><p className="address">{event.address}</p><div className="route-item"><span>01</span><div><h4>На автомобиле</h4><p>Перед визитом отправим точку встречи и инструкции по въезду.</p></div></div><div className="route-item"><span>02</span><div><h4>Планируйте поездку заранее</h4><p>Выберите удобное время выезда, чтобы спокойно приехать к началу знакомства.</p></div></div><div className="address-note"><Icon type="pin" /><p>{event.addressNote}</p></div><a className="secondary-link dark-link" href="#registration">Получить детали визита <span>↗</span></a></div></div></div></section>
    <Registration />
  </main>{event.demo && <div className="demo-label">Демо · название, дата и площадка предварительные</div>}</>;
}

ReactDOM.render(<App />, document.getElementById('root'));
