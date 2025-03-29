import { test, expect } from '@playwright/test';
import { adminLogin, waitForTableToLoad } from './helpers/admin-test-helpers';

test.describe('Admin Artist Management', () => {
  test.beforeEach(async ({ page }) => {
    // Đăng nhập bằng tài khoản admin trước mỗi test case
    await adminLogin(page);

    // Chuyển hướng đến trang quản lý nghệ sĩ
    await page.goto('/admin/artists');
    await expect(page.getByText('Artist Management')).toBeVisible();

    // Đợi table nghệ sĩ tải xong
    await waitForTableToLoad(page);
    await page.waitForTimeout(2000);
  });

  // TC1: Admin có thể xem danh sách nghệ sĩ
  test('Admin can view artists list', async ({ page }) => {
    const rowCount = await page.locator('table tbody tr').count();
    expect(rowCount).toBeGreaterThan(0);

    // Hoặc kiểm tra row đầu tiên
    await expect(page.locator('table tbody tr').first()).toBeVisible();

    // Xác thực tên cột
    await expect(
      page.getByRole('cell', { name: 'Artist', exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole('cell', { name: 'Monthly Listeners' })
    ).toBeVisible();
    await expect(
      page.getByRole('cell', { name: 'Verification' })
    ).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Status' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Joined' })).toBeVisible();

    // Kiểm tra các cell trong hàng header
    const headerCount = await page.locator('table thead tr th').count();
    expect(headerCount).toBeGreaterThan(0);
  });

  // TC2: Admin có thể tìm kiếm nghệ sĩ
  test('Admin can search for artists', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search artists...');
    await searchInput.click();
    const searchTerm = 'the'; // Sử dụng từ khóa cụ thể
    await searchInput.fill(searchTerm);
    await page.keyboard.press('Enter');

    // Đợi kết quả tìm kiếm tải xong
    await waitForTableToLoad(page);
    await page.waitForTimeout(500); // Thời gian ngắn để UI ổn định

    // Đảm bảo có kết quả hiển thị sau tìm kiếm
    const searchResultCount = await page.locator('table tbody tr').count();
    expect(searchResultCount).toBeGreaterThan(0);

    // Kiểm tra kết quả tìm kiếm - xác nhận có ít nhất một kết quả chứa từ khóa
    const firstRowArtistCell = page
      .locator('table tbody tr')
      .first()
      .locator('td')
      .nth(1);
    await expect(firstRowArtistCell).toContainText(searchTerm, {
      timeout: 10000,
    });

    // Cleanup: Reset search
    await searchInput.clear();
    await page.keyboard.press('Enter');
    await waitForTableToLoad(page);
  });

  // TC3: Admin có thể lọc nghệ sĩ theo status
  test('Admin can filter artists by status', async ({ page }) => {
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Active', exact: true }).click();
    await page.keyboard.press('Escape');
    await waitForTableToLoad(page);
    await page.waitForTimeout(500);

    // Kiểm tra kết quả - xác nhận hiển thị Active
    const activeRowCount = await page.locator('table tbody tr').count();
    if (activeRowCount > 0) {
      await expect(
        page.locator('table tbody tr').first().getByText('Active')
      ).toBeVisible();
    } else {
      console.log('No active artists found to verify filter.');
    }

    // 2. Lọc nghệ sĩ theo trạng thái Inactive
    await page.getByText('Status1').click();
    await page.getByRole('option', { name: 'Active', exact: true }).click(); // Bỏ chọn Active
    await page.getByRole('option', { name: 'Inactive' }).click();
    await page.keyboard.press('Escape');
    await waitForTableToLoad(page);
    await page.waitForTimeout(500);

    // Kiểm tra kết quả - xác nhận hiển thị Inactive
    const inactiveRowCount = await page.locator('table tbody tr').count();
    if (inactiveRowCount > 0) {
      await expect(
        page.locator('table tbody tr').first().getByText('Inactive')
      ).toBeVisible();
    } else {
      console.log('No inactive artists found to verify filter.');
    }

    // 3. Reset filter bằng cách click vào nút Reset
    await page.getByRole('button', { name: 'Reset' }).click();
    await waitForTableToLoad(page);
  });

  // TC4: Admin có thể xem chi tiết thông tin của nghệ sĩ
  test('Admin can view artist details', async ({ page }) => {
    // Click vào tên nghệ sĩ đầu tiên để xem chi tiết
    await page.locator('table tbody tr a').first().click();

    // Đợi trang chi tiết nghệ sĩ tải xong
    await page.waitForTimeout(3000);

    // Xác thực đã chuyển đến trang chi tiết nghệ sĩ
    await expect(page.getByText('Email')).toBeVisible();
    await expect(page.getByText('Verification Status')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Top Songs' })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Discography' })
    ).toBeVisible();
    await expect(
      page.getByRole('textbox', { name: 'Filter discography' })
    ).toBeVisible();
  });

  // TC5: Admin có thể chỉnh sửa thông tin của nghệ sĩ
  test('Admin can edit artist information', async ({ page }) => {
    await page.locator('table tbody tr a').first().click();
    await expect(page.getByText('Bio')).toBeVisible({ timeout: 5000 });

    // Click vào icon MoreVertical để mở modal EditArtistModal
    await page.locator('svg.lucide-ellipsis-vertical').click();

    // Đợi modal hiển thị
    const editModal = page.getByRole('dialog', { name: 'Edit Artist' });
    await expect(editModal).toBeVisible({ timeout: 5000 });

    // Chỉnh sửa tên nghệ sĩ
    const artistNameInput = page.getByLabel('Artist Name');
    await expect(artistNameInput).toBeVisible({ timeout: 5000 });
    const originalName = await artistNameInput.inputValue();
    const newArtistName =
      'Updated ' + originalName + Date.now().toString().slice(-4);
    await artistNameInput.clear();
    await artistNameInput.fill(newArtistName);

    // Chỉnh sửa Bio
    const bioInput = page.getByLabel('Bio');
    await expect(bioInput).toBeVisible();
    await bioInput.clear();
    await bioInput.fill('Updated bio for testing purposes');

    // Nhấn Save để lưu thay đổi
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // Kiểm tra toast thông báo thành công
    await expect(page.getByText('Artist updated successfully')).toBeVisible({
      timeout: 15000,
    });

    // Kiểm tra thông tin đã được cập nhật
    await expect(page.getByText(newArtistName)).toBeVisible({
      timeout: 10000,
    });
  });

  // TC6: Admin có thể vô hiệu hóa (deactivate) tài khoản của nghệ sĩ đang active
  test('Admin can deactivate an active artist', async ({ page }) => {
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Active', exact: true }).click();
    await page.keyboard.press('Escape');
    await waitForTableToLoad(page);
    await page.waitForTimeout(1000);

    // Lấy dòng đầu tiên trong bảng (nghệ sĩ active)
    const activeRow = page.locator('table tbody tr').first();
    await expect(activeRow).toBeVisible();

    // Xác nhận đây là nghệ sĩ Active
    const statusCell = activeRow.locator('td').nth(4);
    await expect(statusCell).toContainText('Active', { timeout: 5000 });

    // Tìm button action trong hàng
    const actionButtonCell = activeRow.locator('td').nth(6);
    const actionButton = actionButtonCell.locator('button').first();
    await actionButton.click();

    // Click vào tùy chọn "Deactivate"
    await page.getByRole('menuitem', { name: 'Deactivate' }).click();

    // Xử lý modal deactivate
    const deactivateModal = page.getByRole('dialog', {
      name: 'Deactivate Artist',
    });
    await expect(deactivateModal).toBeVisible({ timeout: 5000 });
    await deactivateModal
      .getByText('Inappropriate content or behavior')
      .click();
    await deactivateModal.getByRole('button', { name: 'Deactivate' }).click();

    // Kiểm tra toast thành công
    await expect(page.getByText('Artist deactivated successfully')).toBeVisible(
      {
        timeout: 15000,
      }
    );

    // Kiểm tra lại Status sau khi deactivate
    await waitForTableToLoad(page);
    await page.waitForTimeout(1000);

    // Xác nhận trạng thái đã thay đổi thành Inactive
    const statusCellAfter = page
      .locator('table tbody tr')
      .first()
      .locator('td')
      .nth(4);
    await expect(statusCellAfter).toContainText('Inactive', { timeout: 10000 });
  });

  // TC7: Admin có thể kích hoạt (activate) tài khoản của nghệ sĩ đang inactive
  test('Admin can activate an inactive artist', async ({ page }) => {
    // Lọc chỉ hiển thị nghệ sĩ inactive
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Inactive' }).click();
    await page.keyboard.press('Escape');
    await waitForTableToLoad(page);
    await page.waitForTimeout(1000);

    // Lấy dòng đầu tiên trong bảng (nghệ sĩ inactive)
    const inactiveRow = page.locator('table tbody tr').first();
    await expect(inactiveRow).toBeVisible();

    // Xác nhận đây là nghệ sĩ Inactive
    const statusCell = inactiveRow.locator('td').nth(4);
    await expect(statusCell).toContainText('Inactive', { timeout: 5000 });

    // Tìm button action trong hàng
    const actionButtonCell = inactiveRow.locator('td').nth(6);
    const actionButton = actionButtonCell.locator('button').first();
    await actionButton.click();

    // Click vào tùy chọn "Activate"
    await page.getByRole('menuitem', { name: 'Activate' }).click();

    // Kiểm tra toast thành công
    await expect(page.getByText('Artist activated successfully')).toBeVisible({
      timeout: 15000,
    });

    // Kiểm tra lại Status sau khi activate
    await waitForTableToLoad(page);
    await page.waitForTimeout(1000);

    // Xác nhận trạng thái đã thay đổi thành Active
    const statusCellAfter = page
      .locator('table tbody tr')
      .first()
      .locator('td')
      .nth(4);
    await expect(statusCellAfter).toContainText('Active', { timeout: 10000 });
  });

  // TC8: Admin có thể xóa nghệ sĩ
  test('Admin can delete an artist', async ({ page }) => {
    // Lắng nghe và tự động chấp nhận dialog xác nhận xóa
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Are you sure you want to delete');
      await dialog.accept();
    });

    // Lấy dòng đầu tiên trong bảng
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible();

    // Lấy tên nghệ sĩ từ dòng đầu tiên để xác minh sau khi xóa
    const artistNameElement = firstRow.locator('td').nth(1).locator('a');
    const artistNameToDelete = await artistNameElement.textContent();
    expect(artistNameToDelete).toBeTruthy(); // Đảm bảo lấy được tên

    // Tìm ô thứ 7 (index 6) rồi tìm button bên trong
    const actionButtonCell = firstRow.locator('td').nth(6);
    const actionButton = actionButtonCell.locator('button');

    // Click nút action để mở menu
    await actionButton.click();

    // Click vào tùy chọn "Delete" trong menu
    await page.getByRole('menuitem', { name: 'Delete' }).click();

    // Kiểm tra toast thông báo xóa thành công
    await expect(page.getByText('Artist deleted successfully')).toBeVisible();

    // Đợi một chút để bảng cập nhật sau khi xóa
    await page.waitForTimeout(1000);

    // Kiểm tra nghệ sĩ đã bị xóa khỏi bảng
    await expect(
      page.locator(`table tbody tr:has-text("${artistNameToDelete}")`)
    ).not.toBeVisible();
  });

  // TC9: Admin có thể chuyển trang để xem danh sách nghệ sĩ ở các trang khác nhau
  test('Admin can paginate through genres', async ({ page }) => {
    await waitForTableToLoad(page);
    await page.waitForTimeout(1000);

    // Define the locator for the genre name column cells (2nd column)
    const genreNameCellsLocator = page.locator(
      'table tbody tr td:nth-child(2)'
    );

    // Lấy thông tin trang đầu tiên
    const page1Genres = await genreNameCellsLocator.allTextContents();

    // Kiểm tra xem có đủ dữ liệu để phân trang không
    const nextButton = page.getByRole('button', { name: 'Next', exact: true });
    const isNextEnabled = await nextButton.isEnabled();

    if (!isNextEnabled || page1Genres.length === 0) {
      test.skip(
        true,
        'Skipping pagination test due to insufficient data or no genres found on page 1'
      );
      return;
    }

    // PHẦN 1: Chuyển đến trang 2 bằng nút Next
    await nextButton.click();
    await waitForTableToLoad(page);
    await page.waitForTimeout(2000);

    // Kiểm tra đã chuyển đến trang 2
    const pageInput = page.getByRole('spinbutton');
    await expect(pageInput, 'Page input should show 2 after Next').toHaveValue(
      '2',
      { timeout: 5000 }
    );

    // Lấy dữ liệu trang 2
    const page2Genres = await genreNameCellsLocator.allTextContents();

    // Kiểm tra nội dung trang 2 khác với trang 1
    expect(
      page2Genres,
      'Genres on page 2 should differ from page 1'
    ).not.toEqual(page1Genres);
    expect(page2Genres.length, 'Should have genres on page 2').toBeGreaterThan(
      0
    );

    // PHẦN 2: Quay lại trang 1 bằng nút Previous
    const prevButton = page.getByRole('button', {
      name: 'Previous',
      exact: true,
    });
    await prevButton.click();
    await waitForTableToLoad(page);
    await page.waitForTimeout(2000);

    // Kiểm tra đã quay về trang 1
    await expect(
      pageInput,
      'Page input should show 1 after Previous'
    ).toHaveValue('1', { timeout: 5000 });

    // Lấy dữ liệu trang 1 sau khi quay lại
    const newPage1Genres = await genreNameCellsLocator.allTextContents();
    expect(
      newPage1Genres.length,
      'Should have genres on page 1 after returning'
    ).toBeGreaterThan(0);

    // PHẦN 3: Thử chuyển trang bằng cách nhập số và nhấn Go
    await pageInput.click();
    await pageInput.fill('2');
    const goButton = page.getByRole('button', { name: 'Go' });
    await goButton.click();
    await waitForTableToLoad(page);
    await page.waitForTimeout(2000);

    // Kiểm tra đã chuyển đến trang 2
    await expect(pageInput, 'Page input should show 2 after Go').toHaveValue(
      '2',
      { timeout: 5000 }
    );

    // Lấy dữ liệu trang 2 lần nữa
    const newPage2Genres = await genreNameCellsLocator.allTextContents();

    expect(
      newPage2Genres,
      'Genres on page 2 (via Go) should differ from returned page 1'
    ).not.toEqual(newPage1Genres);
    expect(
      newPage2Genres.length,
      'Should have genres on page 2 after Go'
    ).toBeGreaterThan(0);
  });
});
