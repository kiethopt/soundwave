import { test, expect } from '@playwright/test';
import { adminLogin, waitForTableToLoad } from './helpers/admin-test-helpers';

test.describe('Admin User Management', () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);

    await page.goto('/admin/users');
    await expect(page.getByText('User Management')).toBeVisible();

    await waitForTableToLoad(page);
    await page.waitForTimeout(500);
  });

  // TC1: Admin có thể xem danh sách người dùng
  test('Admin can view users list', async ({ page }) => {
    // Xác thực table người dùng hiển thị và có nội dung
    const rowCount = await page.locator('table tbody tr').count();
    expect(rowCount).toBeGreaterThan(0);

    // Hoặc kiểm tra row đầu tiên
    await expect(page.locator('table tbody tr').first()).toBeVisible();

    // Xác thực tên cột bằng cách nhắm vào các thẻ th thay vì các cell
    await expect(
      page.getByRole('cell', { name: 'User', exact: true })
    ).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Email' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Status' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Joined' })).toBeVisible();

    // Kiểm tra các cell trong hàng header
    const headerCount = await page.locator('table thead tr th').count();
    expect(headerCount).toBeGreaterThan(0);
  });

  // TC2: Admin có thể tìm kiếm người dùng
  test('Admin can search for users', async ({ page }) => {
    // Tìm kiếm với từ khóa đơn giản
    const searchInput = page.getByPlaceholder('Search users...');
    await searchInput.click();
    const searchTerm = 'testuser'; // Use a term likely to be unique if possible
    await searchInput.fill(searchTerm);
    await page.keyboard.press('Enter');

    // Đợi kết quả tìm kiếm tải xong
    await waitForTableToLoad(page);
    await page.waitForTimeout(500); // Small wait for UI stabilization

    // Đảm bảo có kết quả hiển thị sau tìm kiếm
    const searchResultCount = await page.locator('table tbody tr').count();
    expect(searchResultCount).toBeGreaterThan(0);

    // Verify the search term appears in the user cell (td:nth(1))
    // Target the div inside the second cell that contains the name/username
    const firstRowUserCell = page
      .locator('table tbody tr')
      .first()
      .locator('td')
      .nth(1);
    // Find a div within the cell that contains the search term but doesn't start with '@'
    // Or simply check if the cell itself contains the text non-strictly
    await expect(firstRowUserCell).toContainText(searchTerm, {
      timeout: 10000,
    });

    // Cleanup: Reset search
    await searchInput.clear();
    await page.keyboard.press('Enter');
    await waitForTableToLoad(page);
  });

  // TC3: Admin có thể lọc người dùng theo status
  test('Admin can filter users by status', async ({ page }) => {
    // 1. Lọc người dùng theo trạng thái Active
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
      console.log('No active users found to verify filter.');
    }

    // 2. Lọc người dùng theo trạng thái Inactive
    await page.getByText('Status1').click(); // Button text changes when filter applied
    await page.getByRole('option', { name: 'Active', exact: true }).click(); // Deselect Active
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
      console.log('No inactive users found to verify filter.');
    }

    // 3. Reset filter bằng cách click vào nút Reset
    await page.getByRole('button', { name: 'Reset' }).click();
    await waitForTableToLoad(page);
    await page.waitForTimeout(500);
  });

  // TC4: Admin có thể xem chi tiết thông tin của người dùng
  test('Admin can view user details', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible();

    // Click the user cell to open details (alternative to action button)
    await firstRow.locator('td').nth(1).click();

    // Verify modal title
    const modalTitle = page.getByRole('heading', { name: 'User Information' });
    await expect(modalTitle).toBeVisible({ timeout: 10000 });

    const modalContent = page.getByRole('dialog', { name: 'User Information' });
    await expect(
      modalContent.getByText('Username', { exact: true })
    ).toBeVisible();
    await expect(modalContent.getByText('Created At')).toBeVisible();
    await expect(modalContent.getByText('Role')).toBeVisible();
    await expect(modalContent.getByText('Current Profile')).toBeVisible();
    await expect(modalContent.getByText('Last Login')).toBeVisible();

    // Close the modal - Target the close button within the dialog
    await modalContent.getByRole('button', { name: 'Close' }).nth(1).click();
    await expect(modalTitle).not.toBeVisible();
  });

  // TC5: Admin có thể chỉnh sửa thông tin của người dùng
  test('Admin can edit user information', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.getByRole('button').first().click();

    // Click vào Edit User
    await page.getByRole('menuitem', { name: 'Edit User' }).click();

    // Đợi modal hiển thị
    const editModal = page.getByRole('dialog', { name: 'Edit User' });
    await expect(editModal).toBeVisible();
    await expect(
      editModal.getByRole('heading', { name: 'Edit User' })
    ).toBeVisible();
    await page.waitForTimeout(500);

    // Chỉnh sửa Name
    const nameInput = editModal.locator('#name');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    const originalName = await nameInput.inputValue();
    const newUserName =
      'Updated ' + originalName + Date.now().toString().slice(-3);
    await nameInput.clear();
    await nameInput.fill(newUserName);

    // Chỉnh sửa Username
    const usernameInput = editModal.locator('#username');
    await expect(usernameInput).toBeVisible();
    const originalUsername = await usernameInput.inputValue();
    const newUsername =
      'upd_' + originalUsername + Date.now().toString().slice(-3);
    await usernameInput.clear();
    await usernameInput.fill(newUsername);

    // Nhấn Save để lưu thay đổi
    await editModal.getByRole('button', { name: 'Save Changes' }).click();

    // Kiểm tra toast thông báo thành công
    await expect(page.getByText('User updated successfully')).toBeVisible({
      timeout: 15000,
    });

    // Kiểm tra thông tin đã được cập nhật trên bảng (search for the new name)
    await waitForTableToLoad(page);
    const searchInput = page.getByPlaceholder('Search users...');
    await searchInput.fill(newUserName);
    await page.keyboard.press('Enter');
    await waitForTableToLoad(page);
    await page.waitForTimeout(2000);

    // Đợi kết quả tìm kiếm và kiểm tra
    await expect(
      page
        .locator('table tbody tr')
        .first()
        .getByText(newUserName, { exact: false })
    ).toBeVisible({
      timeout: 10000,
    });

    // Cleanup: Reset search
    await searchInput.clear();
    await page.keyboard.press('Enter');
    await waitForTableToLoad(page);
    await page.waitForTimeout(2000);
  });

  // TC6: Admin có thể vô hiệu hóa (deactivate) tài khoản của người dùng đang active
  test('Admin can deactivate an active user', async ({ page }) => {
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Active', exact: true }).click();
    await page.keyboard.press('Escape');
    await waitForTableToLoad(page);
    await page.waitForTimeout(2000);

    // Lấy dòng đầu tiên trong bảng (người dùng active)
    const activeRow = page.locator('table tbody tr').first();
    await expect(activeRow).toBeVisible();

    // Xác nhận đây là người dùng Active
    const statusCell = activeRow.locator('td').nth(3);
    await expect(statusCell).toContainText('Active', { timeout: 5000 });

    // Tìm button action trong hàng
    const actionButton = activeRow.getByRole('button').first();
    await actionButton.click();

    // Click vào tùy chọn "Deactivate"
    await page.getByRole('menuitem', { name: 'Deactivate' }).click();

    // Xử lý modal deactivate
    const deactivateModal = page.getByRole('dialog', {
      name: 'Deactivate User',
    });
    await expect(deactivateModal).toBeVisible({ timeout: 5000 });
    await deactivateModal
      .getByText('Inappropriate content or behavior')
      .click();
    await deactivateModal.getByRole('button', { name: 'Deactivate' }).click();

    // Kiểm tra toast thành công
    await expect(page.getByText('User deactivated successfully')).toBeVisible({
      timeout: 15000,
    });

    // Kiểm tra lại Status sau khi deactivate
    await waitForTableToLoad(page);
    await page.waitForTimeout(1000);
    const statusCellAfter = page
      .locator('table tbody tr')
      .first()
      .locator('td')
      .nth(3);
    await expect(statusCellAfter).toContainText('Inactive', { timeout: 10000 });
  });

  // TC7: Admin có thể kích hoạt (activate) tài khoản của người dùng đang inactive
  test('Admin can activate an inactive user', async ({ page }) => {
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Inactive' }).click();
    await page.keyboard.press('Escape');
    await waitForTableToLoad(page);
    await page.waitForTimeout(2000);

    // Lấy dòng đầu tiên trong bảng (người dùng inactive)
    const inactiveRow = page.locator('table tbody tr').first();
    await expect(inactiveRow).toBeVisible();

    // Xác nhận đây là người dùng Inactive
    const statusCell = inactiveRow.locator('td').nth(3);
    await expect(statusCell).toContainText('Inactive', { timeout: 5000 });

    // Tìm button action trong hàng
    const actionButton = inactiveRow.getByRole('button').first();
    await actionButton.click();

    // Click vào tùy chọn "Activate"
    await page.getByRole('menuitem', { name: 'Activate' }).click();

    // Kiểm tra toast thành công
    await expect(page.getByText('User activated successfully')).toBeVisible({
      timeout: 15000,
    });

    // Kiểm tra lại Status sau khi activate
    await waitForTableToLoad(page);
    await page.waitForTimeout(1000);
    const statusCellAfter = page
      .locator('table tbody tr')
      .first()
      .locator('td')
      .nth(3);
    await expect(statusCellAfter).toContainText('Active', { timeout: 10000 });
  });

  // TC8: Admin có thể xóa người dùng
  test('Admin can delete a user', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain(
        'Are you sure you want to delete this user'
      );
      await dialog.accept();
    });

    // Lấy dòng đầu tiên trong bảng
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible();

    // Lấy email người dùng để xác minh sau khi xóa (Email is usually unique)
    const emailCell = firstRow.locator('td').nth(2);
    const emailToDelete = await emailCell.textContent();
    expect(emailToDelete).toBeTruthy();

    // Click vào button action
    await firstRow.locator('td').last().getByRole('button').click();

    // Click vào tùy chọn "Delete"
    await page.getByRole('menuitem', { name: 'Delete' }).click();

    // Kiểm tra toast thông báo xóa thành công
    await expect(page.getByText('User deleted successfully')).toBeVisible({
      timeout: 15000,
    });

    // Đợi bảng cập nhật
    await page.waitForTimeout(1500);
    await waitForTableToLoad(page);

    // Tìm kiếm người dùng đã xóa
    const searchInput = page.getByPlaceholder('Search users...');
    await searchInput.fill(emailToDelete as string);
    await page.keyboard.press('Enter');
    await waitForTableToLoad(page);
    await page.waitForTimeout(2500);

    // Kiểm tra xuất hiện thông báo "No results."
    await expect(page.getByText('No results.', { exact: true })).toBeVisible({
      timeout: 10000,
    });

    // Cleanup: Reset search
    await searchInput.clear();
    await page.keyboard.press('Enter');
    await waitForTableToLoad(page);
  });

  // TC9: Admin có thể chuyển trang để xem danh sách người dùng ở các trang khác nhau
  test('Admin can paginate through users', async ({ page }) => {
    await waitForTableToLoad(page);
    await page.waitForTimeout(1000);

    // Define the locator for the email column cells (3rd column)
    const emailCellsLocator = page.locator('table tbody tr td:nth-child(3)');

    // Lấy thông tin trang đầu tiên
    const page1Emails = await emailCellsLocator.allTextContents();

    // Kiểm tra xem có đủ dữ liệu để phân trang không
    const nextButton = page.getByRole('button', { name: 'Next', exact: true });
    const isNextEnabled = await nextButton.isEnabled();

    if (!isNextEnabled || page1Emails.length === 0) {
      test.skip(
        true,
        'Skipping pagination test due to insufficient data or no emails found on page 1'
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
    const page2Emails = await emailCellsLocator.allTextContents();

    // Kiểm tra nội dung trang 2 khác với trang 1
    expect(
      page2Emails,
      'Emails on page 2 should differ from page 1'
    ).not.toEqual(page1Emails);
    expect(page2Emails.length, 'Should have emails on page 2').toBeGreaterThan(
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
    const newPage1Emails = await emailCellsLocator.allTextContents();
    expect(
      newPage1Emails.length,
      'Should have emails on page 1 after returning'
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
    const newPage2Emails = await emailCellsLocator.allTextContents();

    expect(
      newPage2Emails,
      'Emails on page 2 (via Go) should differ from returned page 1'
    ).not.toEqual(newPage1Emails);
    expect(
      newPage2Emails.length,
      'Should have emails on page 2 after Go'
    ).toBeGreaterThan(0);
  });
});
