import { Page, expect } from '@playwright/test';

/**
 * Create a new user account
 */
export async function createAccount(
  page: Page,
  email = 'testuser@gmail.com',
  username = 'testuser',
  password = 'password123'
) {
  await page.goto('/register');
  await page.locator('input#email').fill(email);
  await page.locator('input#username').fill(username);
  await page.locator('input#password').fill(password);
  await page.locator('input#confirmPassword').fill(password);
  await page.locator('button[type="submit"]:has-text("Sign up")').click();

  // Wait for registration to complete and redirect to login
  await expect(page).toHaveURL('/login');
}

/**
 * Login as an user
 */
export async function userLogin(
  page: Page,
  username = 'testuser@gmail.com',
  password = 'password123'
) {
  await page.goto('/login');
  await page.locator('input#emailOrUsername').fill(username);
  await page.locator('input#password').fill(password);
  await page.locator('button[type="submit"]:has-text("Login")').click();

  // Wait for the home page to load
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('button', { name: 'User avatar' })).toBeVisible();
}

/**
 * Logout the current user
 */
export async function userLogout(page: Page) {
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
 * Edit user profile
 */
export async function editUserProfile(page: Page, newUsername = 'newtestuser') {
  // click on the user avatar button
  const avatarButton = page.getByRole('button', { name: 'User avatar' });
  await expect(avatarButton).toBeVisible();
  await avatarButton.click();

  // view the profile
  const ProfileButton = page.getByRole('button', { name: 'Profile' });
  await expect(ProfileButton).toBeVisible();
  await ProfileButton.click();

  // wait for the profile page to load
  await expect(page).toHaveURL(/\/profile\/.+/);

  // click more horizontal button
  const moreButton = page.getByRole('button', { name: 'More' });
  await expect(moreButton).toBeVisible();
  await moreButton.click();

  // click edit profile button
  const editProfileButton = page.getByRole('button', { name: 'Edit Profile' });
  await expect(editProfileButton).toBeVisible();
  await editProfileButton.click();

  // wait for the edit profile page to load
  await expect(page).toHaveURL('/edit-profile');

  // fill in the new username
  await page.locator('input#username').fill(newUsername);
  await page.locator('input#username').press('Enter');

  // Wait for profile update to complete
  await expect(page.getByText('Profile updated successfully')).toBeVisible();
}
