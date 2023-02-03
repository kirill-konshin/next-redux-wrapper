import {test, expect, Page} from '@playwright/test';

const openPage = (page: Page, baseURL, url = '/') => page.goto(`${baseURL}${url}`);

test('shows the page', async ({page, baseURL}) => {
    await openPage(page, baseURL);

    await page.waitForSelector('div.index');

    await expect(page.locator('body')).toContainText('"page": "async text"');
    await expect(page.locator('body')).toContainText('"custom": "custom"');
});
