import { test, expect } from '@playwright/test';
import { adminLogin, waitForTableToLoad } from './helpers/admin-test-helpers';

test.describe('Admin Artist Request Management', () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);

    await page.goto('/admin/artist-requests');
    await expect(
      page.getByRole('heading', { name: 'Artist Requests' })
    ).toBeVisible();

    await waitForTableToLoad(page);
    await page.waitForTimeout(2000);
  });

  // TC1: Admin có thể xem danh sách requests để trở thành artist từ User gửi lên
  test('Admin can view requests list', async ({ page }) => {
    // Xác thực table requests hiển thị và có nội dung
    await expect(page.locator('table tbody tr')).toBeVisible();

    // Xác thực tên cột
    await expect(page.getByRole('cell', { name: 'Artist Name' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Email' })).toBeVisible();
    await expect(
      page.getByRole('cell', { name: 'Requested At' })
    ).toBeVisible();

    // Kiểm tra các cell trong hàng header
    const headerCount = await page.locator('table thead tr th').count();
    expect(headerCount).toBeGreaterThan(0);

    // Kiểm tra có dữ liệu trong bảng
    const rowCount = await page.locator('table tbody tr').count();
    expect(rowCount).toBeGreaterThan(0);
  });

  // TC2: Admin có thể tìm kiếm request
  test('Admin can search for requests', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search requests...');
    await searchInput.click();
    await searchInput.fill('Artist 8');
    await page.keyboard.press('Enter');

    // Đợi kết quả tìm kiếm tải xong
    await page.waitForTimeout(2000);

    // Đảm bảo có kết quả hiển thị sau tìm kiếm (hoặc message không có kết quả)
    const searchResultCount = await page.locator('table tbody tr').count();

    if (searchResultCount > 0) {
      await expect(page.locator('table tbody tr').first()).toBeVisible();
    } else {
      await expect(page.locator('table tbody')).toContainText('No results');
    }

    // Reset search
    await searchInput.clear();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
  });

  // TC3: Admin có thể lọc request theo date-range
  test('Admin can filter requests by date-range', async ({ page }) => {
    // Mở date range picker
    await page.locator('button:has(.lucide-calendar)').click();

    // Chọn ngày bắt đầu (12/03/2025)
    await page
      .getByLabel('March')
      .getByRole('gridcell', { name: '12' })
      .click();

    // Chọn ngày kết thúc (13/03/2025)
    await page
      .getByLabel('March')
      .getByRole('gridcell', { name: '13' })
      .click();

    // Đóng date picker
    await page.keyboard.press('Escape');

    // Đợi bảng tải lại
    await page.waitForTimeout(2000);
    await waitForTableToLoad(page);

    // Kiểm tra kết quả lọc (có thể có hoặc không có kết quả)
    const filteredRowCount = await page.locator('table tbody tr').count();

    if (filteredRowCount > 0) {
      await expect(page.locator('table tbody tr').first()).toBeVisible();
    } else {
      await expect(page.locator('table tbody')).toContainText('No results');
    }

    // Reset lại bằng cách chọn ngày hiện tại
    await page.locator('button:has(.lucide-calendar)').click();

    // Chọn ngày hiện tại (27/03/2025)
    await page.getByRole('gridcell', { name: '27' }).nth(1).click();
    await page.getByRole('gridcell', { name: '27' }).nth(1).click();

    // Đóng date picker
    await page.keyboard.press('Escape');

    // Đợi bảng tải lại
    await page.waitForTimeout(2000);
    await waitForTableToLoad(page);

    // Kiểm tra xem có dữ liệu ban đầu đã quay trở lại chưa
    const resetRowCount = await page.locator('table tbody tr').count();
    expect(resetRowCount).toBeGreaterThan(0);
  });

  // TC4: Admin có thể xem chi tiết thông tin của request
  test('Admin can view request details', async ({ page }) => {
    // Click vào artist name đầu tiên để xem chi tiết
    await page.locator('table tbody tr a').first().click();

    // Đợi trang chi tiết tải xong
    await page.waitForTimeout(3000);

    // Xác thực đã chuyển đến trang chi tiết request
    await expect(page.getByRole('link', { name: 'Back' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reject' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Artist Bio' })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Request Details' })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Social Profiles' })
    ).toBeVisible();
    await expect(page.getByText('Email')).toBeVisible();
    await expect(page.getByText('Request Date')).toBeVisible();
    await expect(page.getByText('Status')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Facebook' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Instagram' })).toBeVisible();
  });

  // TC5: Admin có thể approve artist request
  test('Admin can approve artist request', async ({ page }) => {
    // Click vào artist name đầu tiên để xem chi tiết
    await page.locator('table tbody tr a').first().click();

    // Đợi trang chi tiết tải xong
    await page.waitForTimeout(3000);

    // Xác thực đã chuyển đến trang chi tiết request
    await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible();

    // Click vào nút Approve
    await page.getByRole('button', { name: 'Approve' }).click();

    // Kiểm tra toast thông báo thành công
    await expect(
      page.getByText('Artist request approved successfully')
    ).toBeVisible();

    // Xác thực đã chuyển hướng về trang danh sách request
    await page.waitForTimeout(2000);
    await expect(page.locator('table')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Artist Requests' })
    ).toBeVisible();
  });

  // TC6: Admin có thể reject artist request
  test('Admin can reject artist request', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Are you sure you want to reject');
      await dialog.accept();
    });

    // Click vào artist name đầu tiên để xem chi tiết
    await page.locator('table tbody tr a').first().click();

    // Đợi trang chi tiết tải xong
    await page.waitForTimeout(3000);

    // Xác thực đã chuyển đến trang chi tiết request
    await expect(page.getByRole('button', { name: 'Reject' })).toBeVisible();

    // Click vào nút Reject
    await page.getByRole('button', { name: 'Reject' }).click();

    // Kiểm tra toast thông báo thành công
    await expect(
      page.getByText('Artist request rejected successfully')
    ).toBeVisible();

    // Xác thực đã chuyển hướng về trang danh sách request
    await page.waitForTimeout(2000);
    await expect(page.locator('table')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Artist Requests' })
    ).toBeVisible();
  });
});
