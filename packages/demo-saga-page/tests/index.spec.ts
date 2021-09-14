import {test, expect, Page} from '@playwright/test';

const openPage = (page: Page, url = '/') => page.goto(`http://localhost:5050${url}`);

test('shows the page', async ({page}) => {
    await openPage(page);

    await page.waitForSelector('div.index');

    await expect(page.locator('body')).toContainText('"page": "async text"');
    await expect(page.locator('body')).toContainText('"custom": "custom"');
});
