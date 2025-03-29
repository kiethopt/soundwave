import { test, expect } from '@playwright/test';
import {
  adminLogin,
  waitForTableToLoad,
  generateRandomId,
} from './helpers/admin-test-helpers';

test.describe('Admin Genre Management', () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);

    await page.goto('/admin/genres');
    await expect(page.getByText('Genre Management')).toBeVisible();

    await waitForTableToLoad(page);
    await page.waitForTimeout(2000);
  });

  // TC1: Admin có thể xem danh sách genres (thể loại)
  test('Admin can view genres list', async ({ page }) => {
    await expect(page.locator('table tbody tr').first()).toBeVisible();

    // Kiểm tra các cột trong bảng - điều chỉnh để phù hợp với cấu trúc thực của bảng
    await expect(page.locator('table thead th').nth(1)).toContainText('Name');
    await expect(page.locator('table thead th').nth(2)).toContainText(
      'Created At'
    );

    // Kiểm tra các cell trong hàng header
    const headerCount = await page.locator('table thead tr th').count();
    expect(headerCount).toBeGreaterThan(0);

    // Kiểm tra có dữ liệu trong bảng
    const rowCount = await page.locator('table tbody tr').count();
    expect(rowCount).toBeGreaterThan(0);
  });

  // TC2: Admin có thể tìm kiếm genre
  test('Admin can search for genre', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search genres...');
    await searchInput.click();
    await searchInput.fill('pop');
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

  // TC3: Admin có thể tạo genre mới
  test('Admin can create a new genre', async ({ page }) => {
    await page.evaluate(() => {
      window.dispatchEvent(new Event('openAddGenreModal'));
    });

    // Đợi modal hiển thị
    await expect(
      page.getByRole('heading', { name: 'Add New Genre' })
    ).toBeVisible();

    // Điền thông tin genre mới
    const newGenreName = `Test Genre ${generateRandomId()}`;
    await page.getByRole('textbox', { name: 'Genre Name' }).fill(newGenreName);

    // Click nút Add Genre để tạo
    await page.getByRole('button', { name: 'Add Genre' }).click();

    // Kiểm tra thông báo thành công
    await expect(page.getByText('Genre created successfully')).toBeVisible();

    // Đợi table reload và kiểm tra genre mới được thêm vào
    await waitForTableToLoad(page);
    await page.waitForTimeout(1000);

    // Tìm kiếm genre vừa tạo
    const searchInput = page.getByPlaceholder('Search genres...');
    await searchInput.click();
    await searchInput.fill(newGenreName);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // Kiểm tra xem genre mới có trong danh sách không
    await expect(page.getByText(newGenreName)).toBeVisible();

    // Reset search
    await searchInput.clear();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
  });

  // TC4: Admin có thể chỉnh sửa genre
  test('Admin can edit a genre', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible();
    const genreNameCell = firstRow.locator('td').nth(1);
    const genreNameToEdit = await genreNameCell.textContent();
    expect(genreNameToEdit).toBeTruthy();

    // Click nút action (trong cột cuối cùng)
    const actionButton = firstRow.locator('td').last().getByRole('button');
    await actionButton.click();

    // Click vào Edit Genre
    await page.getByRole('menuitem', { name: 'Edit Genre' }).click();

    // Đợi modal hiển thị
    const editModal = page.getByRole('dialog', { name: 'Edit Genre' });
    await expect(editModal).toBeVisible();
    await expect(
      editModal.getByRole('heading', { name: 'Edit Genre' })
    ).toBeVisible();
    await page.waitForTimeout(500);

    // Chỉnh sửa tên genre
    const nameInput = editModal.locator('input#name');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    const updatedGenreName = `Updated ${genreNameToEdit} ${generateRandomId()}`;
    await nameInput.clear();
    await nameInput.fill(updatedGenreName);

    // Click nút Save Changes để lưu
    await editModal.getByRole('button', { name: 'Save Changes' }).click();

    // Kiểm tra thông báo thành công
    await expect(page.getByText('Genre updated successfully')).toBeVisible({
      timeout: 15000, // Tăng timeout chờ toast
    });

    // Đợi bảng cập nhật và tìm kiếm genre với tên MỚI
    await waitForTableToLoad(page); // Đợi bảng load lại sau khi update
    const searchInput = page.getByPlaceholder('Search genres...');
    await searchInput.click();
    await searchInput.fill(updatedGenreName);
    await page.keyboard.press('Enter');

    // Đợi kết quả tìm kiếm tải xong
    await waitForTableToLoad(page);
    await page.waitForTimeout(2000);

    // Kiểm tra xem genre đã được cập nhật trong bảng chưa (trong kết quả tìm kiếm)
    const searchResultFirstRow = page.locator('table tbody tr').first();
    await expect(searchResultFirstRow.locator('td').nth(1)).toContainText(
      updatedGenreName,
      { timeout: 10000 }
    );

    // Reset search
    await searchInput.clear();
    await page.keyboard.press('Enter');
    await waitForTableToLoad(page);
    await page.waitForTimeout(1000);
  });

  // TC5: Admin có thể xóa genre
  test('Admin can delete a genre', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Delete 1 selected genres?');
      await dialog.accept();
    });

    // Lấy dòng đầu tiên trong bảng
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible();

    // Lấy tên genre để xác minh sau khi xóa
    const genreNameCell = firstRow.locator('td').nth(1);
    const genreNameToDelete = await genreNameCell.textContent();
    expect(genreNameToDelete).toBeTruthy();

    // Click vào button action
    const actionButton = firstRow.locator('td').last().getByRole('button');
    await actionButton.click();

    // Đợi menu hiển thị đầy đủ
    await page.waitForTimeout(500);

    // Click vào tùy chọn "Delete Genre" và thêm thời gian chờ
    await page
      .getByRole('menuitem', { name: 'Delete Genre' })
      .click({ timeout: 5000 });

    // Thêm thời gian chờ sau khi click để đảm bảo dialog xác nhận xuất hiện
    await page.waitForTimeout(1000);

    // Kiểm tra toast thông báo xóa thành công
    await expect(page.getByText('1 genre(s) deleted successfully')).toBeVisible(
      {
        timeout: 15000,
      }
    );

    // Đợi bảng cập nhật
    await waitForTableToLoad(page);
    await page.waitForTimeout(1500);

    // Tìm kiếm genre đã xóa
    const searchInput = page.getByPlaceholder('Search genres...');
    await searchInput.click();
    await searchInput.fill(genreNameToDelete as string);
    await page.keyboard.press('Enter');
    await waitForTableToLoad(page);
    await page.waitForTimeout(2000);

    // Kiểm tra xuất hiện thông báo "No results."
    await expect(page.getByText('No results.', { exact: true })).toBeVisible({
      timeout: 10000,
    });

    // Cleanup: Reset search
    await searchInput.clear();
    await page.keyboard.press('Enter');
    await waitForTableToLoad(page);
  });

  // TC6: Admin có thể chuyển trang để xem danh sách genre ở các trang khác nhau
  test('Admin can paginate through genres', async ({ page }) => {
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

      if (initialRowContent && nextToPage2Content) {
        expect(nextToPage2Content).not.toEqual(initialRowContent);
      }
    } else {
      console.log('Not on page 1, skipping Next button test');
    }
  });
});
