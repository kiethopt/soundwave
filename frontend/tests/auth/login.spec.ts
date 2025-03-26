import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the login page before each test
    await page.goto('/login');
  });

  test('should display login form', async ({ page }) => {
    // Check that the login form elements are visible
    await expect(page.getByText('Login to your account')).toBeVisible();
    await expect(page.getByLabel('Email or Username')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
    await expect(page.getByText('Remember me')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Forgot your password?' })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign up' })).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    // Fill the form with invalid credentials
    await page.getByLabel('Email or Username').fill('invaliduser@example.com');
    await page.getByLabel('Password').fill('wrongpassword');

    // Intercept the API call and mock a failed response
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid email/username or password' }),
      });
    });

    // Submit the form
    await page.getByRole('button', { name: 'Login' }).click();

    // Check that the error message is displayed
    await expect(
      page.getByText('Invalid email/username or password')
    ).toBeVisible();
  });

  test('should navigate to home page after successful login', async ({
    page,
  }) => {
    // Fill the form with valid credentials
    await page.getByLabel('Email or Username').fill('testuser@example.com');
    await page.getByLabel('Password').fill('password123');

    // Intercept the API call and mock a successful response
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'fake-token',
          sessionId: 'fake-session-id',
          user: {
            id: '123',
            email: 'testuser@example.com',
            username: 'testuser',
            role: 'USER',
          },
        }),
      });
    });

    // Submit the form
    await page.getByRole('button', { name: 'Login' }).click();

    // Check that localStorage has been updated with user data
    const localStorageToken = await page.evaluate(() =>
      localStorage.getItem('userToken')
    );
    expect(localStorageToken).toBe('fake-token');

    // Check redirection (this might need adjustment based on your app's behavior)
    await expect(page).toHaveURL('/');
  });

  test('should toggle password visibility', async ({ page }) => {
    // Fill the password field
    await page.getByLabel('Password').fill('testpassword');

    // Initially password should be hidden
    const passwordField = page.getByLabel('Password');
    await expect(passwordField).toHaveAttribute('type', 'password');

    // Click the eye icon to show password
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(passwordField).toHaveAttribute('type', 'text');

    // Click again to hide password
    await page.getByRole('button', { name: 'Hide password' }).click();
    await expect(passwordField).toHaveAttribute('type', 'password');
  });
});
