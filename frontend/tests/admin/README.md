# Admin Functionality Tests

This directory contains automated tests for the admin functionality of the Soundwave music website. These tests use Playwright to verify that the admin features work correctly.

## Test Files

- **admin-auth.spec.ts**: Tests for admin authentication and access control
- **admin-users.spec.ts**: Tests for user management features
- **admin-artists.spec.ts**: Tests for artist management features
- **admin-genres.spec.ts**: Tests for genre management features
- **admin-requests.spec.ts**: Tests for artist request management

## Prerequisites

- Node.js installed
- The project dependencies installed (`npm install`)
- A running instance of the backend server
- An admin user account available in the database

## Running the Tests

### Running All Admin Tests

```bash
npx playwright test tests/admin/ --project=chromium
```

### Running a Specific Test File

```bash
npx playwright test tests/admin/admin-auth.spec.ts --project=chromium
```

### Running with UI Mode (for debugging)

```bash
npx playwright test tests/admin/admin-auth.spec.ts --project=chromium --ui
```

## Test Account Setup

The tests assume the existence of an admin user with the following credentials:

- Username: `admin@soundwave.com`
- Password: `admin123@`

If your development environment uses different credentials, update them in the `admin-test-helpers.ts` file.

## Notes for Test Maintenance

1. The tests are designed to be independent of each other.
2. Some tests create test data (users, genres) and then clean up afterward.
3. Skip logic is implemented for tests that require existing data (like artist requests).
4. Selectors are based on the current UI structure. If the UI changes, tests may need to be updated.
5. **Admin Access Restriction**: When testing non-admin access to admin routes, be aware that client-side routing may cause navigation aborts. The test uses try/catch blocks to handle these expected errors. This is normal behavior for Next.js applications with client-side authentication checks.

## Troubleshooting

If tests fail, check the following:

1. Make sure the backend server is running
2. Verify the admin user exists in the database
3. Check if the UI structure or selectors have changed
4. Ensure the test data prerequisites are met
