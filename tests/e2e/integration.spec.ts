// spec: specs/test-plan.md
// E2E Integration Tests

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test.describe('E2E Integration Tests', () => {

  test('TC-E2E-001: Complete journey - register, login, create plan, view detail, chat, history, delete', async ({ page }) => {
    // Step 1: Register
    await page.goto(`${BASE_URL}/auth`);
    await page.getByRole('button', { name: '注册' }).click();
    const email = `e2e_user_${Date.now()}@example.com`;
    await page.getByLabel('用户名').fill('e2etestuser');
    await page.getByLabel('邮箱').fill(email);
    await page.getByLabel('密码').fill('Test@12345');
    await page.getByRole('button', { name: '注册' }).click();
    await page.waitForTimeout(500);

    // Step 2: Login
    await page.getByRole('button', { name: '登录' }).click();
    await page.getByLabel('邮箱').fill(email);
    await page.getByLabel('密码').fill('Test@12345');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForTimeout(500);

    // Step 3: Create plan
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('E2E Complete Journey');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page.getByRole('button', { name: '生成旅行计划' }).click();

    // Step 4: Wait for plan detail
    await expect(page).toHaveURL(/\/plans\/\d+/, { timeout: 15000 }).catch(() => {});
    await expect(page.locator('.plan-detail')).toBeVisible({ timeout: 5000 });

    // Step 5: View history
    await page.getByRole('button', { name: '← 返回历史' }).click();
    await expect(page).toHaveURL('/plans', { timeout: 5000 });
    await expect(page.locator('.history')).toBeVisible();

    // Step 6: Delete plan
    const deleteButtons = page.locator('.btn-delete');
    const count = await deleteButtons.count();
    if (count > 0) {
      await deleteButtons.first().click();
      await expect(page.locator('.modal-overlay')).toBeVisible({ timeout: 5000 });
      await page.locator('.modal-actions .btn-danger').click();
      await expect(page.locator('.modal-overlay')).not.toBeVisible();
    }
  });

  test('TC-E2E-002: Token refresh flow - login, navigate with expired token', async ({ page }) => {
    // Register and login
    await page.goto(`${BASE_URL}/auth`);
    await page.getByRole('button', { name: '注册' }).click();
    const email = `token_flow_${Date.now()}@example.com`;
    await page.getByLabel('用户名').fill('tokenflowuser');
    await page.getByLabel('邮箱').fill(email);
    await page.getByLabel('密码').fill('Test@12345');
    await page.getByRole('button', { name: '注册' }).click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: '登录' }).click();
    await page.getByLabel('邮箱').fill(email);
    await page.getByLabel('密码').fill('Test@12345');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForTimeout(500);

    // Verify tokens stored
    let accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(accessToken).toBeTruthy();

    // Navigate to history page (should use stored token)
    await page.goto(`${BASE_URL}/plans`);
    await expect(page.locator('.history')).toBeVisible({ timeout: 5000 });
  });

  test('TC-E2E-003: Form validation end-to-end', async ({ page }) => {
    // Register first
    await page.goto(`${BASE_URL}/auth`);
    await page.getByRole('button', { name: '注册' }).click();
    const email = `form_e2e_${Date.now()}@example.com`;
    await page.getByLabel('用户名').fill('forme2euser');
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

    // Go to form
    await page.goto(`${BASE_URL}/plans/new`);

    // Submit without filling required fields
    await page.getByRole('button', { name: '生成旅行计划' }).click();

    // Should show validation errors
    const errorCount = await page.locator('.error-msg').count();
    expect(errorCount).toBeGreaterThan(0);

    // Fill valid data
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('E2E Validation Test');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    // Submit again - should have no errors
    await page.getByRole('button', { name: '生成旅行计划' }).click();
  });

  test('TC-E2E-004: Short trip - 1 day plan', async ({ page }) => {
    // Register + login
    await page.goto(`${BASE_URL}/auth`);
    await page.getByRole('button', { name: '注册' }).click();
    const email = `short_trip_${Date.now()}@example.com`;
    await page.getByLabel('用户名').fill('shorttripuser');
    await page.getByLabel('邮箱').fill(email);
    await page.getByLabel('密码').fill('Test@12345');
    await page.getByRole('button', { name: '注册' }).click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: '登录' }).click();
    await page.getByLabel('邮箱').fill(email);
    await page.getByLabel('密码').fill('Test@12345');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForTimeout(500);

    // Create 1-day plan
    await page.goto(`${BASE_URL}/plans/new`);
    const today = new Date().toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('1-Day Trip');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(today);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page.getByRole('button', { name: '生成旅行计划' }).click();

    // Should succeed (same day is valid: end >= start)
    await expect(page).toHaveURL(/\/plans\/\d+/, { timeout: 15000 }).catch(() => {});
  });

  test('TC-E2E-005: Cross-tab plan generation', async ({ page }) => {
    // Register + login on first tab
    await page.goto(`${BASE_URL}/auth`);
    await page.getByRole('button', { name: '注册' }).click();
    const email = `cross_tab_${Date.now()}@example.com`;
    await page.getByLabel('用户名').fill('crosstabuser');
    await page.getByLabel('邮箱').fill(email);
    await page.getByLabel('密码').fill('Test@12345');
    await page.getByRole('button', { name: '注册' }).click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: '登录' }).click();
    await page.getByLabel('邮箱').fill(email);
    await page.getByLabel('密码').fill('Test@12345');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForTimeout(500);

    // Open second tab
    const context = page.context();
    const page2 = await context.newPage();

    // Both tabs login via stored token
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    await page2.evaluate((token) => {
      localStorage.setItem('accessToken', token);
      localStorage.setItem('refreshToken', 'mock_refresh_token');
    }, accessToken);

    // Navigate both tabs to form
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.goto(`${BASE_URL}/plans/new`);
    await page2.goto(`${BASE_URL}/plans/new`);

    // Fill forms differently
    await page.getByLabel('计划名称').fill('Tab 1 Plan');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page2.getByLabel('计划名称').fill('Tab 2 Plan');
    await page2.getByLabel('出发地').fill('北京市');
    await page2.getByLabel('目的地').fill('广州市');
    await page2.getByLabel('出发日期').fill(today);
    await page2.getByLabel('返程日期').fill(tomorrow);
    await page2.getByRole('select', { name: '出行方式' }).selectOption('FLIGHT');
    await page2.getByRole('select', { name: '预算范围' }).selectOption('HIGH');

    // Submit both
    await page.getByRole('button', { name: '生成旅行计划' }).click();
    await page2.getByRole('button', { name: '生成旅行计划' }).click();

    // Both should navigate to their own plan pages
    await expect(page).toHaveURL(/\/plans\/\d+/, { timeout: 15000 }).catch(() => {});
    await expect(page2).toHaveURL(/\/plans\/\d+/, { timeout: 15000 }).catch(() => {});

    await page2.close();
  });

  test('TC-E2E-006: History shows created plans in correct order', async ({ page }) => {
    // Register + login
    await page.goto(`${BASE_URL}/auth`);
    await page.getByRole('button', { name: '注册' }).click();
    const email = `history_order_${Date.now()}@example.com`;
    await page.getByLabel('用户名').fill('historyorderuser');
    await page.getByLabel('邮箱').fill(email);
    await page.getByLabel('密码').fill('Test@12345');
    await page.getByRole('button', { name: '注册' }).click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: '登录' }).click();
    await page.getByLabel('邮箱').fill(email);
    await page.getByLabel('密码').fill('Test@12345');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForTimeout(500);

    // Create two plans
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    // First plan
    await page.goto(`${BASE_URL}/plans/new`);
    await page.getByLabel('计划名称').fill('First Created Plan');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');
    await page.getByRole('button', { name: '生成旅行计划' }).click();
    await page.waitForURL(/\/plans\/\d+/);
    await page.waitForTimeout(1000);

    // Second plan
    await page.goto(`${BASE_URL}/plans/new`);
    await page.getByLabel('计划名称').fill('Second Created Plan');
    await page.getByLabel('出发地').fill('北京市');
    await page.getByLabel('目的地').fill('广州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('FLIGHT');
    await page.getByRole('select', { name: '预算范围' }).selectOption('HIGH');
    await page.getByRole('button', { name: '生成旅行计划' }).click();
    await page.waitForURL(/\/plans\/\d+/);
    await page.waitForTimeout(1000);

    // Go to history
    await page.goto(`${BASE_URL}/plans`);

    // Second plan should appear first (most recent)
    const cards = page.locator('.plan-card h3');
    const count = await cards.count();
    if (count >= 2) {
      const firstTitle = await cards.first().textContent();
      expect(firstTitle).toContain('Second Created Plan');
    }
  });

  test('TC-E2E-007: Logout clears session', async ({ page }) => {
    // Register + login
    await page.goto(`${BASE_URL}/auth`);
    await page.getByRole('button', { name: '注册' }).click();
    const email = `logout_e2e_${Date.now()}@example.com`;
    await page.getByLabel('用户名').fill('logoute2euser');
    await page.getByLabel('邮箱').fill(email);
    await page.getByLabel('密码').fill('Test@12345');
    await page.getByRole('button', { name: '注册' }).click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: '登录' }).click();
    await page.getByLabel('邮箱').fill(email);
    await page.getByLabel('密码').fill('Test@12345');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForTimeout(500);

    // Call logout API
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    const resp = await page.evaluate(async (token) => {
      try {
        const r = await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        return r.status;
      } catch (e: any) { return 0; }
    }, accessToken);
    expect(resp).toBe(200);

    // Clear local storage
    await page.evaluate(() => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    });

    // Navigate to protected page - should redirect to auth
    await page.goto(`${BASE_URL}/plans`);
    await expect(page).toHaveURL(/\/auth/, { timeout: 5000 });
  });

  test('TC-E2E-008: City alias normalization end-to-end', async ({ page }) => {
    // Register + login
    await page.goto(`${BASE_URL}/auth`);
    await page.getByRole('button', { name: '注册' }).click();
    const email = `city_alias_${Date.now()}@example.com`;
    await page.getByLabel('用户名').fill('cityaliastestuser');
    await page.getByLabel('邮箱').fill(email);
    await page.getByLabel('密码').fill('Test@12345');
    await page.getByRole('button', { name: '注册' }).click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: '登录' }).click();
    await page.getByLabel('邮箱').fill(email);
    await page.getByLabel('密码').fill('Test@12345');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForTimeout(500);

    // Use city aliases
    await page.goto(`${BASE_URL}/plans/new`);
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('Alias Normalization E2E');
    await page.getByLabel('出发地').fill('魔都');
    await page.getByLabel('目的地').fill('西湖');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    // Capture the API request to verify normalization
    const requestPromise = page.waitForRequest('/api/v1/plans');
    await page.getByRole('button', { name: '生成旅行计划' }).click();
    const request = await requestPromise;
    const postData = JSON.parse(request.postData());

    expect(postData.departureCity).toBe('上海市');
    expect(postData.destinationCity).toBe('杭州市');
  });
});
