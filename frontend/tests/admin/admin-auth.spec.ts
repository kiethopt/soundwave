import { test, expect } from '@playwright/test';
import { adminLogin, adminLogout } from './helpers/admin-test-helpers';

test.describe('Admin Authentication', () => {
  // TC1: Admin đăng nhập thành công
  test('Admin login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input#emailOrUsername').fill('admin@soundwave.com');
    await page.locator('input#password').fill('admin123@');
    await page.locator('button[type="submit"]:has-text("Login")').click();

    // Xác thực đã được chuyển hướng đến trang admin dashboard
    await expect(page).toHaveURL('/admin/dashboard');
    await expect(page.getByText('Admin Dashboard')).toBeVisible();
  });

  // TC2: Admin đăng nhập thất bại
  test('Admin login with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input#emailOrUsername').fill('admin@soundwave.com');
    await page.locator('input#password').fill('wrongpassword');
    await page.locator('button[type="submit"]:has-text("Login")').click();

    // Xác thực lỗi và vẫn ở trang đăng nhập
    await expect(page).toHaveURL('/login');
    await expect(
      page.getByText('Invalid email/username or password')
    ).toBeVisible();
  });

  // TC3: Admin đăng xuất
  test('Admin logout', async ({ page }) => {
    await adminLogin(page);
    await adminLogout(page);

    // Kiểm tra lại việc đăng xuất
    await page.goto('/admin/dashboard');
    // Chuyển hướng trở lại trang đăng nhập
    await expect(page).toHaveURL('/login');
  });

  // Test 4: Non-admin trying to access admin pages
  test('Non-admin user cannot access admin pages', async ({ page }) => {
    // First create and login as a regular user
    await page.goto('/register');
    const randomNum = Math.floor(Math.random() * 100000);
    const username = `testuser${randomNum}`;
    const email = `testuser${randomNum}@example.com`;

    await page.locator('input#email').fill(email);
    await page.locator('input#username').fill(username);
    await page.locator('input#password').fill('password123');
    await page.locator('input#confirmPassword').fill('password123');
    await page.locator('button[type="submit"]:has-text("Sign up")').click();

    // Login with the created user
    await page.goto('/login');
    await page.locator('input#emailOrUsername').fill(username);
    await page.locator('input#password').fill('password123');
    await page.locator('button[type="submit"]:has-text("Login")').click();

    // Verify we're on the home page after login
    await expect(page).toHaveURL('/');

    // Try to access admin dashboard - using try/catch since we expect the navigation
    // might be aborted by client-side routing
    try {
      await page.goto('/admin/dashboard', { timeout: 5000 });
    } catch (error) {
      // Expected behavior - navigation might be aborted by client-side routing
      console.log('Navigation was aborted as expected for non-admin user');
    }

    // Verify user remains on or is redirected to the home page
    // Wait a moment for any client-side redirects to complete
    await page.waitForTimeout(2000);

    // Either the URL should be the home page or we should see home page content
    // and definitely NOT see admin dashboard content
    try {
      // Check if we're on the home page URL
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/admin/dashboard');

      // Verify admin dashboard content is not visible
      await expect(page.getByText('Admin Dashboard')).not.toBeVisible();
    } catch (error) {
      // If the above check fails, we should definitely be on the home page
      await expect(page).toHaveURL('/');
    }
  });

  // Test 5: Access to Admin Dashboard after login
  test('Admin can access dashboard with statistics', async ({ page }) => {
    await adminLogin(page);

    // Verify dashboard components are visible
    await expect(page.getByText('Admin Dashboard')).toBeVisible();
    await expect(page.getByText('Total Users')).toBeVisible();
    await expect(page.getByText('Verified Artists')).toBeVisible();
    await expect(page.getByText('Pending Requests')).toBeVisible();
    await expect(page.getByText('Music Genres')).toBeVisible();

    // First verify the "User Growth" chart container is visible
    const chartContainer = page
      .locator('div', { hasText: 'User Growth' })
      .first();
    await expect(chartContainer).toBeVisible();

    // Then verify the canvas element is visible inside the User Growth section
    // Wait a bit longer for the chart to render
    await page.waitForTimeout(1000);

    // Verify the canvas element exists and is visible
    await expect(page.locator('canvas[role="img"]')).toBeVisible();

    // Alternatively, we can also check if the chart buttons are visible
    await expect(page.getByRole('button', { name: '6M' })).toBeVisible();
    await expect(page.getByRole('button', { name: '1Y' })).toBeVisible();
  });
});
