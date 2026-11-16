import { chromium } from 'playwright';

const [headline, source, absent] = process.argv.slice(2);
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8080/');
  await page.getByRole('heading', { name: headline, exact: true }).waitFor({ timeout: 10000 });
  await page.getByRole('link', { name: new RegExp(source) }).waitFor();
  if (absent && await page.getByRole('heading', { name: absent, exact: true }).count()) {
    throw new Error('Unexpected follow-up before ingestion');
  }
  await page.getByRole('textbox').fill('no matches for this query');
  await page.getByText('No matching stories.', { exact: true }).waitFor();
} finally {
  await browser.close();
}
