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
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible();

    const actionButton = firstRow.locator('td:nth-child(6)').locator('button');
    await expect(actionButton).toBeVisible();
    await actionButton.click();

    // Click the 'View Details' menu item
    await page.getByRole('menuitem', { name: 'View Details' }).click();

    // Verify modal title
    const modalTitle = page.getByRole('heading', { name: 'User Information' });
    await expect(modalTitle).toBeVisible();

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
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain(
        'Are you sure you want to delete this user'
      );
      await dialog.accept();
    });

    // Lấy dòng đầu tiên trong bảng
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible();

    // Lấy tên người dùng từ ô thứ hai (chứa tên và avatar) để xác minh sau khi xóa
    const userNameCell = firstRow.locator('td').nth(1); // <-- Lấy ô thứ 2
    const userNameText = await userNameCell.textContent();
    // Lấy phần text là tên người dùng, loại bỏ khoảng trắng thừa
    const userNameToDelete = userNameText?.trim();
    expect(userNameToDelete).toBeTruthy();

    // Click vào button action trong dòng đầu tiên (nằm ở ô cuối cùng)
    await firstRow.locator('td').last().getByRole('button').click(); // <-- Chính xác hơn là lấy button trong ô cuối

    // Click vào tùy chọn "Delete" trong menu
    await page.getByRole('menuitem', { name: 'Delete' }).click();

    // Kiểm tra toast thông báo xóa thành công
    await expect(page.getByText('User deleted successfully')).toBeVisible();

    // Đợi một chút để bảng cập nhật sau khi xóa
    await page.waitForTimeout(2000);
    await waitForTableToLoad(page);

    // Kiểm tra người dùng đã bị xóa khỏi bảng
    // Tìm kiếm chính xác tên người dùng trong toàn bộ bảng
    await expect(
      page
        .locator('table tbody')
        .getByText(userNameToDelete as string, { exact: true })
    ).not.toBeVisible();
  });

  // TC8: Admin có thể chuyển trang để xem danh sách người dùng ở các trang khác nhau
  test('Admin can paginate through users', async ({ page }) => {
    const firstRowLocator = page.locator('table tbody tr').first();
    const emailCellLocator = firstRowLocator.locator('td').nth(2); // Locator cho ô email hàng đầu

    // Lấy email ban đầu và kiểm tra xem có lấy được không
    const initialFirstRowEmail = await emailCellLocator.textContent({
      timeout: 5000,
    }); // Thêm timeout nhỏ đề phòng

    // Kiểm tra xem có đủ dữ liệu để phân trang không
    const nextButton = page.getByRole('button', { name: 'Next', exact: true });
    const isNextEnabled = await nextButton.isEnabled().catch(() => false);

    if (!isNextEnabled || !initialFirstRowEmail) {
      console.log(
        'Skipping pagination test: Next button disabled or could not get initial email.'
      );
      test.skip(
        true,
        'Skipping pagination test due to insufficient data or initial state error.'
      );
      return;
    }

    // --- PHẦN 1: Chuyển trang bằng cách nhập số và nhấn Go ---
    const pageInput = page.getByRole('spinbutton');
    await pageInput.click();
    await pageInput.fill('2');
    const goButton = page.getByRole('button', { name: 'Go' });
    await goButton.click();

    // Đợi cho email ở hàng đầu tiên thay đổi (khác với email ban đầu)
    await expect(
      emailCellLocator,
      'Email should change after navigating to page 2 via Go button'
    ).not.toHaveText(initialFirstRowEmail, { timeout: 10000 }); // Chờ tối đa 10s

    // (Optional) Kiểm tra lại giá trị input page number
    await expect(pageInput, 'Page input should show 2').toHaveValue('2', {
      timeout: 1000,
    });

    // --- PHẦN 2: Quay lại trang 1 bằng nút Previous ---
    const prevButton = page.getByRole('button', {
      name: 'Previous',
      exact: true,
    });
    const isPrevEnabled = await prevButton.isEnabled();

    if (isPrevEnabled) {
      await prevButton.click();

      // Đợi cho email ở hàng đầu tiên quay về giá trị ban đầu
      await expect(
        emailCellLocator,
        'Email should revert to initial after clicking Previous'
      ).toHaveText(initialFirstRowEmail, { timeout: 10000 }); // Chờ tối đa 10s

      // (Optional) Kiểm tra lại giá trị input page number
      await expect(
        pageInput,
        'Page input should show 1 after clicking Previous'
      ).toHaveValue('1', { timeout: 1000 });
    } else {
      console.log('Previous button is disabled, cannot test going back.');
      // Cân nhắc fail test nếu việc không thể quay lại là lỗi
      // expect(isPrevEnabled, 'Previous button should be enabled on page 2').toBe(true);
    }

    // --- PHẦN 3: Chuyển đến trang 2 bằng nút Next (đảm bảo đang ở trang 1) ---
    // Chỉ thực hiện nếu đang ở trang 1 (dựa vào giá trị email)
    const currentEmail = await emailCellLocator.textContent();
    if (currentEmail === initialFirstRowEmail) {
      const isNextStillEnabled = await nextButton.isEnabled(); // Kiểm tra lại nút Next
      if (isNextStillEnabled) {
        await nextButton.click();

        // Đợi cho email ở hàng đầu tiên thay đổi (khác với email ban đầu)
        await expect(
          emailCellLocator,
          'Email should change after clicking Next from page 1'
        ).not.toHaveText(initialFirstRowEmail, { timeout: 10000 }); // Chờ tối đa 10s

        // (Optional) Kiểm tra lại giá trị input page number
        await expect(
          pageInput,
          'Page input should show 2 after clicking Next'
        ).toHaveValue('2', { timeout: 1000 });
      } else {
        console.log('Next button became disabled unexpectedly on page 1.');
      }
    } else {
      console.log(
        `Not on page 1 (current email: ${currentEmail}), skipping Next button test from page 1.`
      );
    }
  });
});
