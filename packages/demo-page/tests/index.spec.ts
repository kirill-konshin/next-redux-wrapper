import {test, expect, Page} from '@playwright/test';

const openPage = (page: Page, url = '/') => page.goto(`http://localhost:4000${url}`);

test('shows the page', async ({page}) => {
    await openPage(page);

    await page.waitForSelector('div.index');

    await expect(page.locator('body')).toContainText('"page": "was set in index page /"');
    await expect(page.locator('body')).toContainText('"custom": "custom"');
});

test('clicks the button', async ({page}) => {
    await openPage(page, '/other');

    await page.waitForSelector('div.other');

    await expect(page.locator('body')).toContainText('"page": "was set in other page {}"');

    await page.click('text=Navigate to index');

    await page.waitForSelector('div.index');

    await expect(page.locator('body')).toContainText('"page": "was set in index page');
    await expect(page.locator('body')).toContainText('"custom": "custom"');
});

test('initial page props', async ({page}) => {
    await openPage(page, '/pageProps');

    await page.waitForSelector('div.pageProps');

    await expect(page.locator('body')).toContainText('{"prop":"foo"}');
});
