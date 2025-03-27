import { Page, expect } from '@playwright/test';

/**
 * Login as an admin user
 */
export async function adminLogin(
  page: Page,
  username = 'admin@soundwave.com',
  password = 'admin123@'
) {
  await page.goto('/login');
  await page.locator('input#emailOrUsername').fill(username);
  await page.locator('input#password').fill(password);
  await page.locator('button[type="submit"]:has-text("Login")').click();

  // Wait for the admin dashboard to load
  await expect(page).toHaveURL('/admin/dashboard');
  await expect(page.getByRole('button', { name: 'User avatar' })).toBeVisible();
}

/**
 * Logout the current admin user
 */
export async function adminLogout(page: Page) {
  const avatarButton = page.getByRole('button', { name: 'User avatar' });
  await expect(avatarButton).toBeVisible();
  await avatarButton.click();

  const logoutButton = page.getByRole('button', { name: 'Logout' });
  await expect(logoutButton).toBeVisible();
  await logoutButton.click();

  // Verify logout
  await expect(page).toHaveURL('/login');
}

/**
 * Create a test user with a random username
 */
export async function createTestUser(page: Page) {
  const randomNum = Math.floor(Math.random() * 100000);
  const username = `testuser${randomNum}`;
  const email = `testuser${randomNum}@example.com`;

  await page.goto('/register');
  await page.locator('input#email').fill(email);
  await page.locator('input#username').fill(username);
  await page.locator('input#password').fill('password123');
  await page.locator('input#confirmPassword').fill('password123');
  await page.locator('button[type="submit"]:has-text("Sign up")').click();

  // Wait for registration to complete and redirect to login
  await expect(page).toHaveURL('/login');

  return { username, email };
}

/**
 * Generate a unique ID for test entities
 */
export function generateRandomId() {
  return `test-${Math.floor(Math.random() * 1000000)}`;
}

/**
 * Wait for a table to be loaded (has rows)
 */
export async function waitForTableToLoad(page: Page) {
  await page.waitForSelector('table tbody tr', { state: 'visible' });
}

/**
 * Create a test genre with a random name
 */
export async function createTestGenre(page: Page) {
  // First, navigate to the genres page
  await page.goto('/admin/genres');

  // Click the "Add Genre" button (using the event that triggers modal opening)
  await page.evaluate(() => {
    window.dispatchEvent(new Event('openAddGenreModal'));
  });

  // Fill in the form
  const genreName = `Test Genre ${generateRandomId()}`;
  await page.locator('input#name').fill(genreName);
  await page.getByRole('button', { name: 'Add Genre' }).click();

  // Wait for the success message using generic text selector (works with react-hot-toast)
  await page.waitForTimeout(1000); // Short delay for toast to appear
  await expect(page.getByText('Genre created successfully')).toBeVisible({
    timeout: 5000,
  });

  return { name: genreName };
}
