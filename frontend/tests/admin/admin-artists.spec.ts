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
    // Xác thực table nghệ sĩ hiển thị và có nội dung
    await expect(page.locator('table tbody tr')).toBeVisible();

    // Xác thực tên cột
    await expect(page.getByRole('cell', { name: 'Artist' })).toBeVisible();
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
    // Tìm kiếm với từ khóa đơn giản
    const searchInput = page.getByPlaceholder('Search artists...');
    await searchInput.click();
    await searchInput.fill('the');
    await page.keyboard.press('Enter');

    // Đợi kết quả tìm kiếm tải xong
    await page.waitForTimeout(1000);

    // Đảm bảo có kết quả hiển thị sau tìm kiếm
    const searchResultCount = await page.locator('table tbody tr').count();
    expect(searchResultCount).toBeGreaterThan(0);
  });

  // TC3: Admin có thể lọc nghệ sĩ theo status
  test('Admin can filter artists by status', async ({ page }) => {
    // 1. Lọc nghệ sĩ theo trạng thái Active
    // Click vào button Status để mở dropdown
    await page.getByRole('combobox').click();
    await page.waitForTimeout(2000);

    // Chọn Active từ dropdown
    await page.getByRole('option', { name: 'Active', exact: true }).click();

    // Đóng dropdown
    await page.keyboard.press('Escape');
    await waitForTableToLoad(page);

    // Kiểm tra kết quả - xác nhận hiển thị Active
    await expect(page.getByText('Active').first()).toBeVisible();

    // 2. Lọc nghệ sĩ theo trạng thái Inactive
    // Click vào button Status (đã có số 1) để mở dropdown
    await page.getByText('Status1').click();
    await page.waitForTimeout(2000);

    // Bỏ chọn Active (click vào Active để bỏ chọn)
    await page.getByRole('option', { name: 'Active', exact: true }).click();
    // Sau đó chọn Inactive
    await page.getByRole('option', { name: 'Inactive' }).click();

    // Đóng dropdown
    await page.keyboard.press('Escape');
    await waitForTableToLoad(page);

    // Kiểm tra kết quả - xác nhận hiển thị Inactive
    await expect(page.getByText('Inactive').first()).toBeVisible();

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
    // Click vào tên nghệ sĩ đầu tiên để xem chi tiết
    await page.locator('table tbody tr a').first().click();
    await page.waitForTimeout(3000);

    // Click vào icon MoreVertical để mở modal EditArtistModal
    await page.locator('svg.lucide-ellipsis-vertical').click();

    // Đợi modal hiển thị
    await expect(
      page.getByRole('heading', { name: 'Edit Artist' })
    ).toBeVisible();

    // Chỉnh sửa tên nghệ sĩ
    const artistNameInput = page.getByLabel('Artist Name');
    await artistNameInput.clear();
    const newArtistName =
      'Updated Artist Name ' + Date.now().toString().slice(-4);
    await artistNameInput.fill(newArtistName);

    // Chỉnh sửa Bio
    const bioInput = page.getByLabel('Bio');
    await bioInput.clear();
    await bioInput.fill('Updated bio for testing purposes');

    // Thay đổi trạng thái hoạt động (Active/Inactive) bằng switch
    await page.getByRole('switch').click();

    // Nhấn Save để lưu thay đổi
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // Kiểm tra toast thông báo thành công
    await expect(page.getByText('Artist updated successfully')).toBeVisible();

    // Kiểm tra thông tin đã được cập nhật
    await expect(page.getByText(newArtistName)).toBeVisible();
    await expect(
      page.getByText('Updated bio for testing purposes')
    ).toBeVisible();
  });

  // TC6: Admin có thể khóa hoặc kích hoạt lại profile của nghệ sĩ
  test('Admin can activate/deactivate an artist', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Lấy dòng đầu tiên trong bảng
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible();

    // Lấy ô Status của dòng đầu tiên (cột thứ 5)
    const statusCell = firstRow.locator('td').nth(4);
    const initialStatus = await statusCell.textContent();

    // Tìm ô thứ 7 (index 6) rồi tìm button bên trong
    const actionButtonCell = firstRow.locator('td').nth(6); // Ô thứ 7
    const actionButton = actionButtonCell.locator('button'); // Tìm button trong ô đó

    // Xác định hành động cần thực hiện và Status mong đợi sau đó
    const actionToPerform =
      initialStatus === 'Inactive' ? 'Activate' : 'Deactivate';
    const expectedStatusAfterFirstAction =
      initialStatus === 'Inactive' ? 'Active' : 'Inactive';

    // Thực hiện hành động đầu tiên (Activate hoặc Deactivate)
    await actionButton.click();
    await page.getByRole('menuitem', { name: actionToPerform }).click();

    // Kiểm tra toast thành công
    await expect(page.getByText('Artist updated successfully')).toBeVisible();
    await page.waitForTimeout(3000); // Chờ toast biến mất

    // Kiểm tra lại Status sau hành động đầu tiên
    const statusCellAfterFirstAction = page
      .locator('table tbody tr')
      .first()
      .locator('td')
      .nth(4);
    await expect(statusCellAfterFirstAction).toHaveText(
      expectedStatusAfterFirstAction,
      { timeout: 5000 }
    );

    // --- Thực hiện hành động ngược lại ---
    const secondActionToPerform =
      actionToPerform === 'Activate' ? 'Deactivate' : 'Activate';
    const expectedStatusAfterSecondAction = initialStatus!; // Sử dụng non-null assertion vì đã kiểm tra ở trên

    // Tìm ô thứ 7 (index 6) rồi tìm button bên trong
    const actionButtonCellAgain = page
      .locator('table tbody tr')
      .first()
      .locator('td')
      .nth(6);
    const actionButtonAgain = actionButtonCellAgain.locator('button');
    await actionButtonAgain.click();

    await page.getByRole('menuitem', { name: secondActionToPerform }).click();

    // Kiểm tra toast thành công
    await expect(page.getByText('Artist updated successfully')).toBeVisible();
    await page.waitForTimeout(3000); // Chờ toast biến mất

    // Kiểm tra trạng thái sau hành động thứ hai (quay về ban đầu)
    const statusCellAfterSecondAction = page
      .locator('table tbody tr')
      .first()
      .locator('td')
      .nth(4);
    await expect(statusCellAfterSecondAction).toHaveText(
      expectedStatusAfterSecondAction,
      { timeout: 5000 }
    );
  });

  // TC7: Admin có thể xóa nghệ sĩ
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

  // TC8: Admin có thể chuyển trang để xem danh sách nghệ sĩ ở các trang khác nhau
  test('Admin can paginate through artists', async ({ page }) => {
    // Lấy nội dung hàng đầu tiên để so sánh sau này
    const initialRowContent = await page
      .locator('table tbody tr')
      .first()
      .textContent();

    // Kiểm tra xem có nhiều trang không bằng cách kiểm tra nút Next có được bật không
    const nextButton = page.getByRole('button', { name: 'Next', exact: true });
    const isNextEnabled = await nextButton.isEnabled().catch(() => false);

    if (!isNextEnabled) {
      console.log(
        'Next button is disabled, not enough data to test pagination'
      );
      return;
    }

    // PHẦN 1: Chuyển trang bằng cách nhập số và nhấn Go
    // Nhập số trang 2
    const pageInput = page.getByRole('spinbutton');
    await pageInput.click();
    await pageInput.clear();
    await pageInput.fill('2');

    // Click nút Go
    const goButton = page.getByRole('button', { name: 'Go' });
    await goButton.click();

    // Đợi table load lại
    await page.waitForTimeout(2000);
    await waitForTableToLoad(page);

    // Kiểm tra xem nội dung đã thay đổi chưa (đã chuyển sang trang 2)
    const page2Content = await page
      .locator('table tbody tr')
      .first()
      .textContent();

    // Chỉ kiểm tra nội dung khác nhau nếu cả hai trang đều có dữ liệu
    if (initialRowContent && page2Content) {
      expect(page2Content).not.toEqual(initialRowContent);
    }

    // PHẦN 2: Quay lại trang 1 bằng nút Previous
    const prevButton = page.getByRole('button', {
      name: 'Previous',
      exact: true,
    });

    // Kiểm tra xem nút Previous có được enable không
    const isPrevEnabled = await prevButton.isEnabled();
    if (!isPrevEnabled) {
      console.log('Previous button is disabled, cannot test this part');
    } else {
      await prevButton.click();

      // Đợi table load lại
      await page.waitForTimeout(2000);
      await waitForTableToLoad(page);

      // Kiểm tra xem đã quay lại trang 1 chưa
      const backToPage1Content = await page
        .locator('table tbody tr')
        .first()
        .textContent();
      console.log(
        `Back to page 1 content: ${
          backToPage1Content?.substring(0, 20) || 'No content'
        }...`
      );

      if (initialRowContent && backToPage1Content) {
        expect(backToPage1Content).toContain(
          initialRowContent.substring(0, 10)
        );
      }
    }

    // PHẦN 3: Chuyển đến trang 2 bằng nút Next (đảm bảo đang ở trang 1)
    // Chỉ thực hiện nếu đang ở trang 1
    if ((await pageInput.inputValue()) === '1') {
      await nextButton.click();

      // Đợi table load lại
      await page.waitForTimeout(2000);
      await waitForTableToLoad(page);

      // Kiểm tra xem đã chuyển đến trang 2 chưa
      const nextToPage2Content = await page
        .locator('table tbody tr')
        .first()
        .textContent();
      console.log(
        `Next to page 2 content: ${
          nextToPage2Content?.substring(0, 20) || 'No content'
        }...`
      );

      if (initialRowContent && nextToPage2Content) {
        expect(nextToPage2Content).not.toEqual(initialRowContent);
      }
    } else {
      console.log('Not on page 1, skipping Next button test');
    }
  });
});
