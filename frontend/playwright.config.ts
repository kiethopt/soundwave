import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Maximum time one test can run for. */
  // Tăng thời gian chạy tối đa cho mỗi test case (ví dụ: 60 giây)
  timeout: 60 * 1000, // <--- THAY ĐỔI: Tăng từ 30s lên 60s

  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1, // Giữ nguyên retry, 1 lần retry local là hợp lý
  /* Opt out of parallel tests on CI. */
  // workers: process.env.CI ? 1 : undefined, // Mặc định của bạn
  // Thử giảm số worker local nếu máy yếu hoặc gặp vấn đề tài nguyên
  workers: process.env.CI ? 1 : 3, // <--- THAY ĐỔI (Tùy chọn): Giảm worker local xuống 3

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/test-results.json' }],
    ['list'],
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on', // Giữ 'on' để dễ debug khi retry

    /* Capture screenshot on test failure */
    screenshot: 'on',

    /* Record video for failed tests */
    video: 'on',

    /* Set longer timeout for all actions */
    actionTimeout: 15000, // Giữ 15s, có vẻ ổn

    /* Navigation timeout */
    navigationTimeout: 30000, // Giữ 30s, có vẻ ổn
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    /* Bỏ comment nếu cần test mobile */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  /* Configure global assertion timeout */
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    // Tăng thời gian chờ mặc định cho các assertion (ví dụ: 10 giây)
    timeout: 10000, // <--- THAY ĐỔI: Tăng từ 5s lên 10s
  },

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 120s cho web server khởi động là đủ
  },
});
