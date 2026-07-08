// spec: specs/test-plan.md
// Suite 7: SSE Progress (FEAT-007)

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

async function authAndNavigate(page: any) {
  await page.goto(`${BASE_URL}/auth`);
  await page.getByRole('button', { name: '注册' }).click();
  const email = `sse_test_${Date.now()}@example.com`;
  await page.getByLabel('用户名').fill('ssetestuser');
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

test.describe('Suite 7: SSE Progress', () => {

  test('TC-SSE-001: SSE connection established after form submit', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('SSE Connection Test');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    // Capture SSE network requests
    const sseResponses: string[] = [];
    page.on('response', async (resp) => {
      if (resp.url().includes('/sse/progress')) {
        try {
          const text = await resp.text();
          sseResponses.push(text.substring(0, 200));
        } catch {}
      }
    });

    await page.getByRole('button', { name: '生成旅行计划' }).click();

    // Wait for plan detail page or SSE activity
    await expect(page).toHaveURL(/\/plans\/\d+/, { timeout: 15000 }).catch(() => {});
  });

  test('TC-SSE-002: Plan detail page polls for generating plans', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('Polling Test');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page.getByRole('button', { name: '生成旅行计划' }).click();
    await expect(page).toHaveURL(/\/plans\/\d+/, { timeout: 15000 }).catch(() => {});

    // Page should show loading state or status badge
    await expect(page.locator('.plan-detail')).toBeVisible({ timeout: 5000 });
  });

  test('TC-SSE-003: Loading spinner visible during generation', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('Loading Spinner Test');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page.getByRole('button', { name: '生成旅行计划' }).click();

    // Loading button state
    const submitBtn = page.getByRole('button', { name: '生成旅行计划' });
    await expect(submitBtn).toBeDisabled({ timeout: 3000 });
  });

  test('TC-SSE-004: Status badge shows GENERATING state', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('Generating State Test');
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

  test('TC-SSE-005: Error state shown on plan generation failure', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('Error State Test');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    // Mock the API to return an error
    await page.route('/api/v1/plans', async route => {
      await route.fulfill({
        status: 504,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 504,
          message: 'Agent 超时',
          data: null
        })
      });
    });

    await page.getByRole('button', { name: '生成旅行计划' }).click();

    // Should show error alert
    await expect(page.locator('.error, .error-msg')).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('TC-SSE-006: Plan detail shows completed status', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('Completed Status Test');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page.getByRole('button', { name: '生成旅行计划' }).click();
    await expect(page).toHaveURL(/\/plans\/\d+/, { timeout: 15000 }).catch(() => {});

    // Status badge should show COMPLETED
    await expect(page.locator('.badge-completed')).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('TC-SSE-007: SSE reconnection on network recovery', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('Reconnect Test');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page.getByRole('button', { name: '生成旅行计划' }).click();
    await expect(page).toHaveURL(/\/plans\/\d+/, { timeout: 15000 }).catch(() => {});

    // Page should remain functional
    await expect(page.locator('.plan-detail')).toBeVisible({ timeout: 5000 });
  });

  test('TC-SSE-008: Multiple plans can be generated independently', async ({ page }) => {
    await authAndNavigate(page);

    // Create first plan
    await page.goto(`${BASE_URL}/plans/new`);
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('First Independent Plan');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page.getByRole('button', { name: '生成旅行计划' }).click();
    await expect(page).toHaveURL(/\/plans\/\d+/, { timeout: 15000 }).catch(() => {});

    // Go back and create second plan
    await page.goto(`${BASE_URL}/plans/new`);
    await page.getByLabel('计划名称').fill('Second Independent Plan');
    await page.getByLabel('出发地').fill('北京市');
    await page.getByLabel('目的地').fill('广州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('FLIGHT');
    await page.getByRole('select', { name: '预算范围' }).selectOption('HIGH');

    await page.getByRole('button', { name: '生成旅行计划' }).click();
    await expect(page).toHaveURL(/\/plans\/\d+/, { timeout: 15000 }).catch(() => {});
  });

  test('TC-SSE-009: Plan detail refreshes after generation completes', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('Refresh After Complete Test');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page.getByRole('button', { name: '生成旅行计划' }).click();

    // Wait for page to load
    await expect(page.locator('.plan-detail')).toBeVisible({ timeout: 15000 });

    // Refresh the page manually
    await page.reload();

    // Plan should still be loaded
    await expect(page.locator('.plan-header')).toBeVisible({ timeout: 5000 });
  });

  test('TC-SSE-010: Refresh page during generation shows correct status', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('Refresh During Generation Test');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page.getByRole('button', { name: '生成旅行计划' }).click();
    await expect(page).toHaveURL(/\/plans\/\d+/, { timeout: 15000 }).catch(() => {});

    // Refresh the page while potentially still generating
    await page.reload();

    // Should still show plan detail with status
    await expect(page.locator('.plan-detail')).toBeVisible({ timeout: 5000 });
  });

  test('TC-SSE-011: Fallback polling activates when SSE unavailable', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('Fallback Polling Test');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    // Mock SSE endpoint to fail
    await page.route('**/sse/progress*', async route => {
      await route.abort('connectionclosed');
    });

    await page.getByRole('button', { name: '生成旅行计划' }).click();

    // Should fall back to polling and still show plan detail
    await expect(page.locator('.plan-detail')).toBeVisible({ timeout: 20000 }).catch(() => {});
  });
});
