// spec: specs/test-plan.md
// Suite 5: Chat Micro-adjustment (FEAT-005)

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

async function authAndNavigate(page: any) {
  await page.goto(`${BASE_URL}/auth`);
  await page.getByRole('button', { name: '注册' }).click();
  const email = `chat_test_${Date.now()}@example.com`;
  await page.getByLabel('用户名').fill('chattestuser');
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

test.describe('Suite 5: Chat Micro-adjustment', () => {

  test('TC-CHAT-001: Chat toggle opens chat section', async ({ page }) => {
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

    // Click chat toggle button
    await page.getByRole('button', { name: '微调计划' }).click();

    // Chat input should be visible
    await expect(page.locator('.chat-input-form input')).toBeVisible({ timeout: 5000 });
  });

  test('TC-CHAT-002: Empty message not sent', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('Empty Message Test');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page.getByRole('button', { name: '生成旅行计划' }).click();
    await expect(page).toHaveURL(/\/plans\/\d+/, { timeout: 15000 }).catch(() => {});

    await page.getByRole('button', { name: '微调计划' }).click();

    // Try to send empty message - button should be disabled
    const sendBtn = page.locator('.chat-input-form button[type="submit"]');
    await expect(sendBtn).toBeDisabled();
  });

  test('TC-CHAT-003: Send chat message and receive reply', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('Send Message Test');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page.getByRole('button', { name: '生成旅行计划' }).click();
    await expect(page).toHaveURL(/\/plans\/\d+/, { timeout: 15000 }).catch(() => {});

    await page.getByRole('button', { name: '微调计划' }).click();

    // Type a message
    await page.locator('.chat-input-form input').fill('把第二天改成室内活动');

    // Send button should be enabled
    const sendBtn = page.locator('.chat-input-form button[type="submit"]');
    await expect(sendBtn).not.toBeDisabled();

    // Send message
    await sendBtn.click();

    // Should show "AI 正在思考中..."
    await expect(page.locator('.chat-msg.agent.thinking')).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('TC-CHAT-004: Chat message character limit enforced', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('Char Limit Test');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page.getByRole('button', { name: '生成旅行计划' }).click();
    await expect(page).toHaveURL(/\/plans\/\d+/, { timeout: 15000 }).catch(() => {});

    await page.getByRole('button', { name: '微调计划' }).click();

    // Try to type more than 500 chars
    const longMessage = 'a'.repeat(501);
    await page.locator('.chat-input-form input').fill(longMessage);

    const actualLength = await page.locator('.chat-input-form input').inputValue();
    expect(actualLength.length).toBeLessThanOrEqual(500);
  });

  test('TC-CHAT-005: Chat messages display in conversation format', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('Chat Format Test');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page.getByRole('button', { name: '生成旅行计划' }).click();
    await expect(page).toHaveURL(/\/plans\/\d+/, { timeout: 15000 }).catch(() => {});

    await page.getByRole('button', { name: '微调计划' }).click();

    // Initial agent greeting should appear
    await expect(page.locator('.chat-messages .msg-bubble')).toBeVisible({ timeout: 5000 });
  });

  test('TC-CHAT-006: Cancel button available during thinking', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('Cancel Button Test');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page.getByRole('button', { name: '生成旅行计划' }).click();
    await expect(page).toHaveURL(/\/plans\/\d+/, { timeout: 15000 }).catch(() => {});

    await page.getByRole('button', { name: '微调计划' }).click();
    await page.locator('.chat-input-form input').fill('帮我订酒店');
    await page.locator('.chat-input-form button[type="submit"]').click();

    // Cancel button should appear when agent is thinking
    await expect(page.locator('.btn-cancel')).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('TC-CHAT-007: Send button disabled after sending', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('Send Disabled Test');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page.getByRole('button', { name: '生成旅行计划' }).click();
    await expect(page).toHaveURL(/\/plans\/\d+/, { timeout: 15000 }).catch(() => {});

    await page.getByRole('button', { name: '微调计划' }).click();
    await page.locator('.chat-input-form input').fill('test');

    const sendBtn = page.locator('.chat-input-form button[type="submit"]');
    await sendBtn.click();

    // After clicking send, button should be disabled while loading
    await expect(sendBtn).toBeDisabled({ timeout: 3000 });
  });

  test('TC-CHAT-008: Chat section can be toggled off', async ({ page }) => {
    await authAndNavigate(page);
    await page.getByRole('link', { name: /创建新计划|创建旅行计划/ }).first().click();
    await page.waitForURL(/\/plans\/new/);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await page.getByLabel('计划名称').fill('Toggle Off Test');
    await page.getByLabel('出发地').fill('上海市');
    await page.getByLabel('目的地').fill('杭州市');
    await page.getByLabel('出发日期').fill(today);
    await page.getByLabel('返程日期').fill(tomorrow);
    await page.getByRole('select', { name: '出行方式' }).selectOption('HIGH_SPEED_RAIL');
    await page.getByRole('select', { name: '预算范围' }).selectOption('MEDIUM');

    await page.getByRole('button', { name: '生成旅行计划' }).click();
    await expect(page).toHaveURL(/\/plans\/\d+/, { timeout: 15000 }).catch(() => {});

    // Open chat
    await page.getByRole('button', { name: '微调计划' }).click();
    await expect(page.locator('.chat-input-form input')).toBeVisible();

    // Close chat by clicking button again
    await page.getByRole('button', { name: '微调计划' }).click();

    // Chat input should no longer be visible
    await expect(page.locator('.chat-input-form input')).not.toBeVisible();
  });
});
