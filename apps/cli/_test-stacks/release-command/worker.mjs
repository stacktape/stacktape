const RELEASE = 'initial';
console.log(`worker ${RELEASE} started`);
setInterval(() => {}, 60_000);
process.on('SIGTERM', () => process.exit(0));
