import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

const handler: APIGatewayProxyHandlerV2 = async (event, _context) => {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless
  });

  const { url } = event.pathParameters;

  const page = await browser.newPage();
  await page.goto(`http://${url}`);

  const links = await page.evaluate(() => {
    const anchorElements = Array.from(document.getElementsByTagName('a'));
    return anchorElements.map((link) => link.href);
  });

  await browser.close();

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(links, null, 2)
  };
};

export default handler;
