import {test, expect, Page} from '@playwright/test';

const openPage = (page: Page, baseURL: string | undefined, url = '/') => page.goto(`${baseURL}${url}`);

test('shows the page', async ({page, baseURL}) => {
    await openPage(page, baseURL);

    await page.waitForSelector('div.index');

    await expect(page.locator('body')).toContainText('"page": "was set in index page /"');
    await expect(page.locator('body')).toContainText('"custom": "custom"');
});

test('clicks the button', async ({page, baseURL}) => {
    await openPage(page, baseURL, '/other');

    await page.waitForSelector('div.other');

    await expect(page.locator('body')).toContainText('"page": "was set in other page {}"');

    await page.click('text=Navigate to index');

    await page.waitForSelector('div.index');

    await expect(page.locator('body')).toContainText('"page": "was set in index page');
    await expect(page.locator('body')).toContainText('"custom": "custom"');
});

test('initial page props', async ({page, baseURL}) => {
    await openPage(page, baseURL, '/pageProps');

    await page.waitForSelector('div.pageProps');

    await expect(page.locator('body')).toContainText('"prop":"foo"');
});
