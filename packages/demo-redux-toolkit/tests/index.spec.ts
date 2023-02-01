import {test, expect, Page} from '@playwright/test';

const openPage = (page: Page, baseURL: string | undefined, url = '/') => page.goto(`${baseURL}${url}`);

test('shows the page', async ({page, baseURL}) => {
    await openPage(page, baseURL);

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

test.describe('server rendered', () => {
    test.use({javaScriptEnabled: false});

    test('subject page', async ({page, baseURL}) => {
        await openPage(page, baseURL, '/subject/1');

        await expect(page.locator('body')).toContainText('Subject 1');
    });

    test('detail page', async ({page, baseURL}) => {
        await openPage(page, baseURL, '/detail/1');

        await expect(page.locator('body')).toContainText('PageProps.id: 42');
        await expect(page.locator('body')).toContainText('System source: GIAP');
        await expect(page.locator('body')).toContainText('This is the summary for the page with id 1');
    });

    test('gipp page', async ({page, baseURL}) => {
        await openPage(page, baseURL, '/gipp');

        await expect(page.locator('body')).toContainText('PageProps.id: 42');
        await expect(page.locator('body')).toContainText('System source: GIAP');
        await expect(page.locator('body')).toContainText('This is the test data for the gipp page');
        await expect(page.locator('body')).toContainText('Page name: GIPP');
    });
});
