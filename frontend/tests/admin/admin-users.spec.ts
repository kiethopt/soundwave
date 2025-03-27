import { test, expect } from '@playwright/test';
import { adminLogin, waitForTableToLoad } from './helpers/admin-test-helpers';

test.describe('Admin User Management', () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);

    await page.goto('/admin/users');
    await expect(page.getByText('User Management')).toBeVisible();

    await waitForTableToLoad(page);
    await page.waitForTimeout(2000);
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
    await searchInput.fill('test');
    await page.keyboard.press('Enter');

    // Đợi kết quả tìm kiếm tải xong
    await page.waitForTimeout(1000);

    // Đảm bảo có kết quả hiển thị sau tìm kiếm
    const searchResultCount = await page.locator('table tbody tr').count();
    expect(searchResultCount).toBeGreaterThan(0);
  });

  // TC3: Admin có thể lọc người dùng theo status
  test('Admin can filter users by status', async ({ page }) => {
    // 1. Lọc người dùng theo trạng thái Active
    // Click vào button Status để mở dropdown
    await page.getByRole('combobox').click();

    // Chọn Active từ dropdown
    await page.getByRole('option', { name: 'Active', exact: true }).click();

    // Đóng dropdown
    await page.keyboard.press('Escape');
    await waitForTableToLoad(page);
    await page.waitForTimeout(2000);

    // Kiểm tra kết quả - xác nhận hiển thị Active
    await expect(page.getByText('Active').first()).toBeVisible();

    // 2. Lọc người dùng theo trạng thái Inactive
    // Click vào button Status (đã có số 1) để mở dropdown lần nữa
    await page.getByText('Status1').click();

    // Bỏ chọn Active (click vào Active để bỏ chọn)
    await page.getByRole('option', { name: 'Active', exact: true }).click();
    // Sau đó chọn Inactive
    await page.getByRole('option', { name: 'Inactive' }).click();

    // Đóng dropdown
    await page.keyboard.press('Escape');
    await waitForTableToLoad(page);
    await page.waitForTimeout(2000);

    // Kiểm tra kết quả - xác nhận hiển thị Inactive
    await expect(page.getByText('Inactive').first()).toBeVisible();

    // 3. Reset filter bằng cách click vào nút Reset
    await page.getByRole('button', { name: 'Reset' }).click();
    await waitForTableToLoad(page);
    await page.waitForTimeout(2000);
  });

  // TC4: Admin có thể xem chi tiết thông tin của người dùng
  test('Admin can view user details', async ({ page }) => {
    // Click vào button View trong hàng đầu tiên
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.getByRole('button').first().click();
    await page.getByRole('menuitem', { name: 'View Details' }).click();

    // Xác thực các thông tin hiển thị trong modal
    await expect(
      page.getByRole('heading', { name: 'User Information' })
    ).toBeVisible();
    await expect(page.getByText('Email')).toBeVisible();
    await expect(page.getByText('Username')).toBeVisible();
    await expect(page.getByText('Created At')).toBeVisible();
    await expect(page.getByText('Role')).toBeVisible();
    await expect(page.getByText('Current Profile')).toBeVisible();
    await expect(page.getByText('Last Login')).toBeVisible();

    // Đóng modal
    await page.getByRole('button', { name: 'Close' }).nth(1).click();
    await expect(
      page.getByRole('heading', { name: 'User Information' })
    ).not.toBeVisible();
  });

  // TC5: Admin có thể chỉnh sửa thông tin của người dùng
  test('Admin can edit user information', async ({ page }) => {
    // Click vào button Action của hàng đầu tiên
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.getByRole('button').first().click();

    // Click vào Edit User
    await page.getByRole('menuitem', { name: 'Edit User' }).click();

    // Đợi modal hiển thị và đảm bảo nó đã được render đầy đủ
    await expect(
      page.getByRole('heading', { name: 'Edit User' })
    ).toBeVisible();
    await page.waitForTimeout(1000);

    // Chỉnh sửa Name
    const nameInput = page.locator('#name');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.clear();
    const newUserName = 'Updated User Name ' + Date.now().toString().slice(-4);
    await nameInput.fill(newUserName);

    // Chỉnh sửa Username
    const usernameInput = page.locator('#username');
    await expect(usernameInput).toBeVisible();
    await usernameInput.clear();
    await usernameInput.fill(
      'updated_username_' + Date.now().toString().slice(-4)
    );

    // Thay đổi Status (Active/Inactive)
    await page.getByRole('switch').click();

    // Nhấn Save để lưu thay đổi
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // Kiểm tra toast thông báo thành công
    await expect(page.getByText('User updated successfully')).toBeVisible();

    // Kiểm tra thông tin đã được cập nhật trên bảng
    await waitForTableToLoad(page);
    await expect(page.getByText(newUserName)).toBeVisible();
  });

  // TC6: Admin có thể khóa hoặc kích hoạt lại tài khoản của người dùng
  test('Admin can activate/deactivate a user', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Lấy dòng đầu tiên trong bảng
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible();

    // Lấy ô Status của dòng đầu tiên (cột thứ 4)
    const statusCell = firstRow.locator('td').nth(3);
    const initialStatus = await statusCell.textContent();

    // Tìm button action trong hàng
    const actionButton = firstRow.getByRole('button').first();

    // Xác định hành động cần thực hiện và Status mong đợi sau đó
    const actionToPerform = initialStatus?.includes('Inactive')
      ? 'Activate'
      : 'Deactivate';
    const expectedStatusAfterFirstAction = initialStatus?.includes('Inactive')
      ? 'Active'
      : 'Inactive';

    // Thực hiện hành động đầu tiên (Activate hoặc Deactivate)
    await actionButton.click();
    await page.getByRole('menuitem', { name: actionToPerform }).click();

    // Kiểm tra toast thành công
    await expect(page.getByText('User updated successfully')).toBeVisible();
    await page.waitForTimeout(3000); // Chờ toast biến mất

    // Kiểm tra lại Status sau hành động đầu tiên
    await waitForTableToLoad(page);
    const statusCellAfterFirstAction = page
      .locator('table tbody tr')
      .first()
      .locator('td')
      .nth(3);
    await expect(statusCellAfterFirstAction).toContainText(
      expectedStatusAfterFirstAction,
      { timeout: 5000 }
    );

    // --- Thực hiện hành động ngược lại ---
    const secondActionToPerform =
      actionToPerform === 'Activate' ? 'Deactivate' : 'Activate';
    const expectedStatusAfterSecondAction = initialStatus?.includes('Inactive')
      ? 'Inactive'
      : 'Active';

    // Tìm button action trong hàng
    const actionButtonAgain = page
      .locator('table tbody tr')
      .first()
      .getByRole('button')
      .first();
    await actionButtonAgain.click();

    // Thực hiện hành động ngược lại
    await page.getByRole('menuitem', { name: secondActionToPerform }).click();

    // Kiểm tra toast thành công
    await expect(page.getByText('User updated successfully')).toBeVisible();
    await page.waitForTimeout(3000);

    // Kiểm tra trạng thái sau hành động thứ hai (quay về ban đầu)
    await waitForTableToLoad(page);
    const statusCellAfterSecondAction = page
      .locator('table tbody tr')
      .first()
      .locator('td')
      .nth(3);
    await expect(statusCellAfterSecondAction).toContainText(
      expectedStatusAfterSecondAction,
      { timeout: 5000 }
    );
  });

  // TC7: Admin có thể xóa người dùng
  test('Admin can delete a user', async ({ page }) => {
    // Lắng nghe và tự động chấp nhận dialog xác nhận xóa
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain(
        'Are you sure you want to delete this user'
      );
      await dialog.accept();
    });

    // Lấy dòng đầu tiên trong bảng
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible();

    // Lấy tên người dùng từ dòng đầu tiên để xác minh sau khi xóa
    const userNameElement = firstRow.locator('td').nth(0);
    const userNameText = await userNameElement.textContent();
    const userNameToDelete = userNameText?.trim().split('\n')[0]?.trim();
    expect(userNameToDelete).toBeTruthy(); // Đảm bảo lấy được tên

    // Click vào button action trong dòng đầu tiên
    await firstRow.getByRole('button').first().click();

    // Click vào tùy chọn "Delete" trong menu
    await page.getByRole('menuitem', { name: 'Delete' }).click();

    // Kiểm tra toast thông báo xóa thành công
    await expect(page.getByText('User deleted successfully')).toBeVisible();

    // Đợi một chút để bảng cập nhật sau khi xóa
    await page.waitForTimeout(1000);

    // Kiểm tra người dùng đã bị xóa khỏi bảng
    await expect(
      page.getByText(userNameToDelete as string, { exact: true })
    ).not.toBeVisible();
  });

  // TC8: Admin có thể chuyển trang để xem danh sách người dùng ở các trang khác nhau
  test('Admin can paginate through users', async ({ page }) => {
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
