const response = await fetch(`http://127.0.0.1:${process.env.PORT}/`);
process.exit(response.ok ? 0 : 1);
