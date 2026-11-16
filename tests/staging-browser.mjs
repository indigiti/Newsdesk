import { chromium } from 'playwright';

const [headline, source, absent] = process.argv.slice(2);
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8080/newsdesk/');
  await page.getByRole('heading', { name: headline, exact: true }).waitFor({ timeout: 10000 });
  await page.getByRole('link', { name: new RegExp(source) }).waitFor();
  if (absent && await page.getByRole('heading', { name: absent, exact: true }).count()) {
    throw new Error('Unexpected follow-up before ingestion');
  }
  if (absent) {
    await page.getByRole('button', { name: 'Save story', exact: true }).click();
    await page.getByRole('button', { name: /^Saved/ }).click();
    await page.getByRole('heading', { name: headline, exact: true }).waitFor();
    await page.getByRole('button', { name: 'Light', exact: true }).click();
    await page.reload();
    if (await page.locator('.desk').getAttribute('data-theme') !== 'light') {
      await page.waitForSelector('.desk[data-theme="light"]');
    }
    await page.getByRole('button', { name: /^Saved/ }).click();
    await page.getByRole('heading', { name: headline, exact: true }).waitFor();
    await page.getByRole('button', { name: 'Stocks', exact: true }).click();
    await page.getByRole('heading', { name: 'RELIANCE', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Topics', exact: true }).click();
    await page.getByRole('button', { name: 'Economy', exact: true }).last().click();
    await page.getByRole('heading', { name: headline, exact: true }).waitFor();
    await page.getByRole('button', { name: 'Today', exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) {
      throw new Error('Workspace overflows the mobile viewport');
    }
  }
  await page.getByRole('textbox').fill('no matches for this query');
  await page.getByText('No matching stories.', { exact: true }).waitFor();
} finally {
  await browser.close();
}
