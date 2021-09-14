import {test, expect, Page, chromium} from '@playwright/test';

const openPage = (page: Page, url = '/') => page.goto(`http://localhost:6060${url}`);

test('shows the page', async ({page}) => {
    await openPage(page);

    await page.click('text=Go to problem pages');

    await page.waitForSelector('div.page1');

    await expect(page.locator('body')).toContainText('Subject 1');

    await page.click('text=GO id=2');

    await page.waitForSelector('div.page2');

    await expect(page.locator('body')).toContainText('Subject 2');

    await page.click('text=GO id=1');

    await page.waitForSelector('div.page1');

    await expect(page.locator('body')).toContainText('Subject 1');
});

test('server rendered', async () => {
    const browser = await chromium.launch();

    const context = await browser.newContext({
        javaScriptEnabled: false,
    });
    const page = await context.newPage();

    await openPage(page, '/subject/1');

    await expect(page.locator('body')).toContainText('Subject 1');

    await browser.close();
});
