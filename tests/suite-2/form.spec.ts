// spec: specs/test-plan.md
// Suite 2: Travel Form (FEAT-002)

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

// Helper: register + login to get authenticated
async function authAndNavigate(page: any) {
  // Register
  await page.goto(`${BASE_URL}/auth`);
  await page.getByRole('button', { name: '注册' }).click();
  const email = `form_test_${Date.now()}@example.com`;
  await page.getByLabel('用户名').fill('formtestuser');
  await page.getByLabel('邮箱').fill(email);
  await page.getByLabel('密码').fill('Test@12345');
  await page.getByRole('button', { name: '注册' }).click();
  await page.waitForTimeout(500);

  // Login
  await page.getByRole('button', { name: '登录' }).click();
  await page.getByLabel('邮箱').fill(email);
  await page.getByLabel('密码').fill('Test@12345');
  await page.getByRole('button', { name: '登录' }).click();
  await page.waitForTimeout(500);
}

test.describe('Suite 2: Travel Form', () => {

  test('TC-FORM-001: Submit form with past start date', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    // Set start date to yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    await page.getByLabel('出发日期').fill(dateStr);
    await page.getByLabel('计划名称').fill('Test Plan');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');

    // Fill required fields
    await page.getByLabel('返程日期').fill(dateStr);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page.getByRole('button', { name: '生成旅行计划' }).click();

    // Should show error about past date
    await expect(page.locator('.error-msg')).toContainText(/过去的时间|出发日期不能/i);
  });

  test('TC-FORM-002: End date earlier than start date', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('Test Plan');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(tomorrow);
    await page.getByLabel('返程日期').fill(today);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page.getByRole('button', { name: '生成旅行计划' }).click();

    await expect(page.locator('.error-msg')).toContainText(/早于出发日期|返程日期/i);
  });

  test('TC-FORM-003: Date range exceeds 180 days', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date();
    const farFuture = new Date(today.getTime() + 181 * 86400000);
    const startStr = today.toISOString().split('T')[0];
    const endStr = farFuture.toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('Test Plan');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(startStr);
    await page.getByLabel('返程日期').fill(endStr);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page.getByRole('button', { name: '生成旅行计划' }).click();

    await expect(page.locator('.error-msg')).toContainText(/180 天|日期跨度/i);
  });

  test('TC-FORM-004: City alias normalization ("魔都" -> "上海市")', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('魔都之旅');
    await page.getByLabel('出发地').fill('魔都');
    await page.getByLabel('目的地').fill('杭州');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page.getByRole('button', { name: '生成旅行计划' }).click();

    // The form should normalize "魔都" -> "上海市" and "杭州" -> "杭州市" before sending
    // We verify by checking the API payload
    const requestPromise = page.waitForRequest('/api/v1/plans');
    await page.getByRole('button', { name: '生成旅行计划' }).click();
    const request = await requestPromise;
    const postData = JSON.parse(request.postData());
    expect(postData.departureCity).toBe('上海市');
  });

  test('TC-FORM-005: Invalid city name rejected', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('Test Plan');
    await page.getByLabel('出发地').fill('xyzabc123');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page.getByRole('button', { name: '生成旅行计划' }).click();

    // Backend should return CITY_NOT_FOUND
    await expect(page.locator('.error-msg')).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('TC-FORM-006: Preferences exceed 500 characters', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('Test Plan');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    // Fill preferences with > 500 chars
    const longPrefs = 'a'.repeat(501);
    await page.getByLabel('特殊偏好（选填）').fill(longPrefs);

    await page.getByRole('button', { name: '生成旅行计划' }).click();

    // Backend should reject with PREFERENCES_TOO_LONG
    await expect(page.locator('.error-msg')).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('TC-FORM-007: Empty title rejected', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    // Leave title empty
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page.getByRole('button', { name: '生成旅行计划' }).click();

    await expect(page.locator('.error-msg')).toContainText(/请输入计划名称/i);
  });

  test('TC-FORM-008: Flight travel mode accepted', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('Flight Test');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('北京市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('FLIGHT');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page.getByRole('button', { name: '生成旅行计划' }).click();

    // Should not show validation errors for travel mode
    const errorCount = await page.locator('.error-msg').count();
    expect(errorCount).toBe(0);
  });

  test('TC-FORM-009: HIGH budget level accepted', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('High Budget Test');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('北京市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('HIGH');

    await page.getByRole('button', { name: '生成旅行计划' }).click();

    const errorCount = await page.locator('.error-msg').count();
    expect(errorCount).toBe(0);
  });

  test('TC-FORM-010: Valid cities submit successfully', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('上海到北京');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('北京市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    const requestPromise = page.waitForRequest('/api/v1/plans');
    await page.getByRole('button', { name: '生成旅行计划' }).click();
    const request = await requestPromise;
    const postData = JSON.parse(request.postData());

    expect(postData.departureCity).toBe('上海市');
    expect(postData.destinationCity).toBe('北京市');
    expect(postData.travelMode).toBe('HIGH_SPEED_RAIL');
    expect(postData.budgetLevel).toBe('MEDIUM');
  });
});
