import { test, expect } from '@playwright/test';

test.describe('Register', () => {
  // TC1: Đăng ký thành công
  test('Valid Register', async ({ page }) => {
    await page.goto('/register');

    // Tạo username và email ngẫu nhiên để tránh trùng lặp
    const randomNum = Math.floor(Math.random() * 100000);
    const username = `testuser${randomNum}`;
    const email = `testuser${randomNum}@example.com`;

    // Điền thông tin đăng ký
    await page.locator('input#email').fill(email);
    await page.locator('input#username').fill(username);
    await page.locator('input#password').fill('password123');
    await page.locator('input#confirmPassword').fill('password123');

    // Kiểm tra thông báo "Passwords match" hiển thị
    await expect(page.getByText('✅ Passwords match')).toBeVisible();

    // Nhấn nút đăng ký
    await page.locator('button[type="submit"]:has-text("Sign up")').click();

    // Kiểm tra chuyển hướng đến trang login
    await expect(page).toHaveURL('/login');
  });

  // TC2: Đăng ký thất bại do mật khẩu không khớp
  test('Register with Non-matching Passwords', async ({ page }) => {
    await page.goto('/register');

    // Điền thông tin với mật khẩu không khớp
    await page.locator('input#email').fill('test@example.com');
    await page.locator('input#username').fill('testuser');
    await page.locator('input#password').fill('Password123');
    await page.locator('input#confirmPassword').fill('Password456');

    // Kiểm tra thông báo lỗi hiển thị trong quá trình nhập
    await expect(page.getByText('❌ Passwords do not match')).toBeVisible();

    // Nhấn nút đăng ký
    await page.locator('button[type="submit"]:has-text("Sign up")').click();

    // Kiểm tra vẫn ở trang register
    await expect(page).toHaveURL('/register');

    // Kiểm tra thông báo lỗi chính hiển thị
    await expect(
      page.locator('div.bg-red-500\\/10.text-red-500')
    ).toBeVisible();
  });

  // TC3: Kiểm tra liên kết đến trang đăng nhập
  test('Navigate to Login Page', async ({ page }) => {
    await page.goto('/register');

    // Click vào liên kết "Log in"
    await page.getByRole('link', { name: 'Log in' }).click();

    // Kiểm tra đã chuyển đến trang login
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Login - Logout - Remember Me', () => {
  // TC1: Đăng nhập thành công
  test('Valid Login', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input#emailOrUsername').fill('userkiet');
    await page.locator('input#password').fill('password123');
    await page.locator('button[type="submit"]:has-text("Login")').click();

    await expect(page).toHaveURL('/');
    await expect(
      page.getByRole('button', { name: 'User avatar' })
    ).toBeVisible();
  });

  // TC2: Đăng nhập thất bại
  test('Invalid Login', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input#emailOrUsername').fill('userkiet_invalid');
    await page.locator('input#password').fill('wrongpassword');
    await page.locator('button[type="submit"]:has-text("Login")').click();

    await expect(page).toHaveURL('/login');
    await expect(
      page.getByText('Invalid email/username or password')
    ).toBeVisible();
  });

  // TC3: Kiểm tra email/username và password có được lưu khi chọn Remember me
  test('Remember Me', async ({ page }) => {
    // B1: Đăng nhập với Remember me được chọn
    await page.goto('/login');
    await page.locator('input#emailOrUsername').fill('userkiet@example.com');
    await page.locator('input#password').fill('password123');
    await page.getByLabel('Remember me').check();
    await page.locator('button[type="submit"]:has-text("Login")').click();

    await expect(page).toHaveURL('/');

    // B2: Đăng xuất
    const avatarButton = page.getByRole('button', { name: 'User avatar' });
    await expect(avatarButton).toBeVisible();
    await avatarButton.click();

    const logoutButton = page.getByRole('button', { name: 'Logout' });
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    // B3: Quay lại trang login và kiểm tra thông tin đã được lưu
    await expect(page).toHaveURL('/login');

    // Kiểm tra giá trị trong input fields đã được điền sẵn
    const emailField = page.locator('input#emailOrUsername');
    await expect(emailField).toHaveValue('userkiet@example.com');
    // await expect(page.locator('input#password')).toHaveValue('password123');
  });

  // TC4: Đăng xuất
  test('Logout', async ({ page }) => {
    // B1: Đăng nhập
    await page.goto('/login');
    await page.locator('input#emailOrUsername').fill('userkiet@example.com');
    await page.locator('input#password').fill('password123');
    await page.locator('button[type="submit"]:has-text("Login")').click();
    await expect(page).toHaveURL('/');

    // B2: Mở dropdown và đăng xuất
    const avatarButton = page.getByRole('button', { name: 'User avatar' });
    await expect(avatarButton).toBeVisible();
    await avatarButton.click();

    const logoutButton = page.getByRole('button', { name: 'Logout' });
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    // B3: Kiểm tra đã đăng xuất
    await expect(page).toHaveURL('/login');
    await expect(
      page.locator('button[type="submit"]:has-text("Login")')
    ).toBeVisible();
  });
});
