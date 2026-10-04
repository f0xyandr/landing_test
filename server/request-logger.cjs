function createRequestLogger(write = console.log, color = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR) {
  const paint = (text, code) => color ? `\u001b[${code}m${text}\u001b[0m` : text;
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    let logged = false;
    const log = aborted => {
      if (logged) return;
      logged = true;
      const duration = Number(process.hrtime.bigint() - start) / 1000000;
      const status = aborted ? 'ABORT' : String(res.statusCode);
      const statusColor = aborted || res.statusCode >= 500 ? '31' : res.statusCode >= 400 ? '33' : res.statusCode >= 300 ? '36' : '32';
      const time = new Date().toLocaleTimeString('ru-RU', { hour12: false });
      const pathname = JSON.stringify(req.path).slice(1, -1);
      write(`${paint(time, '90')}  ${paint(req.method.padEnd(7), '1;36')} ${paint(status.padEnd(5), statusColor)} ${pathname}  ${paint(`${duration.toFixed(1)} ms`, '90')}`);
    };
    res.once('finish', () => log(false));
    res.once('close', () => log(!res.writableFinished));
    next();
  };
}

module.exports = { createRequestLogger };
