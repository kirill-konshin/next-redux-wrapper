import {test, expect, Page, chromium} from '@playwright/test';

const openPage = (page: Page, url = '/') => page.goto(`http://localhost:6060${url}`);

test('shows the page', async ({page}) => {
    await openPage(page);

    // Problem page 1
    await page.click('text=Go to problem pages');
    await page.waitForSelector('div.page1');

    await expect(page.locator('body')).toContainText('PageProps.id: 42');
    await expect(page.locator('body')).toContainText('Subject 1');

    // Problem page 2
    await page.click('text=GO id=2');
    await page.waitForSelector('div.page2');

    await expect(page.locator('body')).toContainText('PageProps.id: 42');
    await expect(page.locator('body')).toContainText('Subject 2');

    // Detail page 1
    await page.click('text=Go to details id=1');
    await page.waitForSelector('div.page1');

    await expect(page.locator('body')).toContainText('PageProps.id: 42');
    await expect(page.locator('body')).toContainText('System source: GIAP');
    await expect(page.locator('body')).toContainText('This is the summary for the page with id 1');

    // Detail page 2
    await page.click('text=Go to details id=2');
    await page.waitForSelector('div.page2');

    await expect(page.locator('body')).toContainText('PageProps.id: 42');
    await expect(page.locator('body')).toContainText('System source: GIAP');
    await expect(page.locator('body')).toContainText('This is the summary for the page with id 2');

    // Gipp page
    await page.click('text=Go to gipp page');
    await page.waitForSelector('div.page2');

    await expect(page.locator('body')).toContainText('PageProps.id: 42');
    await expect(page.locator('body')).toContainText('System source: GIAP');
    await expect(page.locator('body')).toContainText('This is the test data for the gipp page');
    await expect(page.locator('body')).toContainText('Page name: GIPP');
});

test('server rendered subject page', async () => {
    const browser = await chromium.launch();

    const context = await browser.newContext({
        javaScriptEnabled: false,
    });
    const page = await context.newPage();

    await openPage(page, '/subject/1');

    await expect(page.locator('body')).toContainText('Subject 1');

    await browser.close();
});

test('server rendered detail page', async () => {
    const browser = await chromium.launch();

    const context = await browser.newContext({
        javaScriptEnabled: false,
    });
    const page = await context.newPage();

    await openPage(page, '/detail/1');

    await expect(page.locator('body')).toContainText('PageProps.id: 42');
    await expect(page.locator('body')).toContainText('System source: GIAP');
    await expect(page.locator('body')).toContainText('This is the summary for the page with id 1');

    await browser.close();
});

test('server rendered gipp page', async () => {
    const browser = await chromium.launch();

    const context = await browser.newContext({
        javaScriptEnabled: false,
    });
    const page = await context.newPage();

    await openPage(page, '/gipp');

    await expect(page.locator('body')).toContainText('PageProps.id: 42');
    await expect(page.locator('body')).toContainText('System source: GIAP');
    await expect(page.locator('body')).toContainText('This is the test data for the gipp page');
    await expect(page.locator('body')).toContainText('Page name: GIPP');

    await browser.close();
});
