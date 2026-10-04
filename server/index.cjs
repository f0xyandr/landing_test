const { createApp } = require('./app.cjs');

createApp({ dataDir: process.env.DATA_DIR }).then(({ app }) => {
  const port = Number(process.env.PORT || 3000);
  const server = app.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Landing: http://localhost:${port}`));
  const stop = () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  server.on('error', error => { console.error('Server failed:', error.code); process.exit(1); });
}).catch(error => { console.error('Database initialization failed:', error.code || error.name); process.exit(1); });
