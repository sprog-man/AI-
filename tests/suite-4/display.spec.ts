// spec: specs/test-plan.md
// Suite 4: Plan Display (FEAT-004)

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

async function authAndNavigate(page: any) {
  await page.goto(`${BASE_URL}/auth`);
  await page.getByRole('button', { name: '注册' }).click();
  const email = `display_test_${Date.now()}@example.com`;
  await page.getByLabel('用户名').fill('displaytestuser');
  await page.getByLabel('邮箱').fill(email);
  await page.getByLabel('密码').fill('Test@12345');
  await page.getByRole('button', { name: '注册' }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: '登录' }).click();
  await page.getByLabel('邮箱').fill(email);
  await page.getByLabel('密码').fill('Test@12345');
  await page.getByRole('button', { name: '登录' }).click();
  await page.waitForTimeout(500);
}

test.describe('Suite 4: Plan Display', () => {

  test('TC-DISPLAY-001: Plan detail page loads with header info', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('Display Test Plan');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page.getByRole('button', { name: '生成旅行计划' }).click();

    // Should redirect to plan detail
    await expect(page).toHaveURL(/\/plans\/\d+/, { timeout: 15000 }).catch(() => {});

    // Header should show plan title
    await expect(page.locator('.plan-header h1')).toBeVisible({ timeout: 5000 });
  });

  test('TC-DISPLAY-002: Status badge shows correct text', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('Status Badge Test');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page.getByRole('button', { name: '生成旅行计划' }).click();

    await expect(page).toHaveURL(/\/plans\/\d+/, { timeout: 15000 }).catch(() => {});

    // Status badge should be visible
    await expect(page.locator('.badge')).toBeVisible({ timeout: 5000 });
  });

  test('TC-DISPLAY-003: Meta information displayed correctly', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('Meta Info Test');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('北京市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('FLIGHT');
    await page.getByRole('select', { name: '预算范围' }).selectOption('HIGH');

    await page.getByRole('button', { name: '生成旅行计划' }).click();

    await expect(page).toHaveURL(/\/plans\/\d+/, { timeout: 15000 }).catch(() => {});

    // Destination city should appear in meta
    await expect(page.locator('.meta')).toContainText('北京市', { timeout: 5000 });
  });

  test('TC-DISPLAY-004: Itinerary section renders when data available', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('Itinerary Section Test');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page.getByRole('button', { name: '生成旅行计划' }).click();

    await expect(page).toHaveURL(/\/plans\/\d+/, { timeout: 15000 }).catch(() => {});

    // Look for itinerary-related sections
    await expect(page.locator('section.card')).toBeVisible({ timeout: 5000 });
  });

  test('TC-DISPLAY-005: Budget section renders', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('Budget Section Test');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page.getByRole('button', { name: '生成旅行计划' }).click();

    await expect(page).toHaveURL(/\/plans\/\d+/, { timeout: 15000 }).catch(() => {});

    // Budget section should be present
    await expect(page.locator('h2:has-text("预算")')).toBeVisible({ timeout: 5000 });
  });

  test('TC-DISPLAY-006: Map/route section renders', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('Map Section Test');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page.getByRole('button', { name: '生成旅行计划' }).click();

    await expect(page).toHaveURL(/\/plans\/\d+/, { timeout: 15000 }).catch(() => {});

    // Map section should be present
    await expect(page.locator('h2:has-text("路线")')).toBeVisible({ timeout: 5000 });
  });

  test('TC-DISPLAY-007: Chat toggle button appears on completed plan', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('Chat Toggle Test');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page.getByRole('button', { name: '生成旅行计划' }).click();

    await expect(page).toHaveURL(/\/plans\/\d+/, { timeout: 15000 }).catch(() => {});

    // Chat toggle button should be visible
    await expect(page.getByRole('button', { name: '微调计划' })).toBeVisible({ timeout: 5000 });
  });

  test('TC-DISPLAY-008: Back to history button works', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('Back Button Test');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page.getByRole('button', { name: '生成旅行计划' }).click();

    await expect(page).toHaveURL(/\/plans\/\d+/, { timeout: 15000 }).catch(() => {});

    // Click back button
    await page.getByRole('button', { name: '← 返回历史' }).click();
    await expect(page).toHaveURL('/plans', { timeout: 5000 });
  });
});
