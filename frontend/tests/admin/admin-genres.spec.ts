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
    // Xác thực table genres hiển thị và có nội dung
    await expect(page.locator('table tbody tr').first()).toBeVisible();

    // Kiểm tra các cột hiển thị đúng (đảm bảo mỗi locator chỉ trả về một phần tử)
    await expect(page.getByRole('cell', { name: 'Name' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Created At' })).toBeVisible();
    await expect(
      page
        .getByRole('row', { name: 'Select all Name Created At' })
        .locator('div')
    ).toBeVisible();

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

    // Lấy tên của genre hiện tại để so sánh sau này
    const genreName = await firstRow.locator('td').nth(1).textContent();
    expect(genreName).toBeTruthy();

    // Mở dropdown và chọn Edit
    await firstRow.getByRole('button').first().click();
    await page.getByRole('menuitem', { name: 'Edit Genre' }).click();

    // Đợi modal edit hiển thị
    await expect(
      page.getByRole('heading', { name: 'Edit Genre' })
    ).toBeVisible();

    // Cập nhật tên genre
    const updatedGenreName = `Updated Genre ${generateRandomId()}`;

    // Xóa trường input trước, bảo đảm nó trống
    await page.locator('#name').fill('');
    await page.waitForTimeout(500); // Đợi để đảm bảo input đã xóa

    // Sau đó mới nhập giá trị mới
    await page.locator('#name').fill(updatedGenreName);
    await page.waitForTimeout(500); // Đợi để đảm bảo input đã nhập xong

    // Sử dụng bộ chọn cụ thể hơn cho nút lưu thay đổi
    await page.locator('button:has-text("Save Changes")').click();

    // Đợi một khoảng thời gian ngắn để cho phép toast xuất hiện
    await page.waitForTimeout(1000);

    // Kiểm tra thông báo thành công - sử dụng bộ chọn cho react-hot-toast thay vì react-toastify
    await expect(page.getByText('Genre updated successfully')).toBeVisible({
      timeout: 5000,
    });

    // Đợi table reload
    await page.waitForTimeout(2000);
    await waitForTableToLoad(page);

    // Tìm kiếm genre đã cập nhật
    const searchInput = page.getByPlaceholder('Search genres...');
    await searchInput.click();
    await searchInput.fill(updatedGenreName);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // Kiểm tra xem genre đã được cập nhật chưa
    await expect(page.getByText(updatedGenreName)).toBeVisible();

    // Reset search
    await searchInput.clear();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
  });

  // TC5: Admin có thể xóa genre
  test('Admin can delete a genre', async ({ page }) => {
    // Lắng nghe dialog xác nhận xóa
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Delete');
      await dialog.accept();
    });

    // Lấy dòng đầu tiên trong bảng
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible();

    // Lấy tên của genre hiện tại để kiểm tra sau khi xóa
    const genreName = await firstRow.locator('td').nth(1).textContent();
    expect(genreName).toBeTruthy(); // Đảm bảo lấy được tên

    // Mở dropdown menu và chọn Delete
    await firstRow.getByRole('button').first().click();
    await page.getByRole('menuitem', { name: 'Delete Genre' }).click();

    // Kiểm tra thông báo thành công
    await expect(page.getByText('genre(s) deleted successfully')).toBeVisible();

    // Đợi table reload
    await page.waitForTimeout(2000);
    await waitForTableToLoad(page);

    // Tìm kiếm lại, nên không còn thấy genre đã xóa
    const searchInput = page.getByPlaceholder('Search genres...');
    await searchInput.click();
    await searchInput.fill(genreName || '');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // Ở trên UI nên hiện "No results"
    await expect(page.locator('table tbody')).toContainText('No results');

    // Reset search
    await searchInput.clear();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
  });

  // TC6: Admin có thể xóa một lượt nhiều genres (bulk delete)
  test('Admin can bulk delete multiple genres', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Delete');
      await dialog.accept();
    });

    // Lấy hai dòng đầu tiên trong bảng
    const firstRow = page.locator('table tbody tr').nth(0);
    const secondRow = page.locator('table tbody tr').nth(1);

    await expect(firstRow).toBeVisible();
    await expect(secondRow).toBeVisible();

    // Lấy tên của hai genre để kiểm tra sau khi xóa
    const genreName1 = await firstRow.locator('td').nth(1).textContent();
    const genreName2 = await secondRow.locator('td').nth(1).textContent();

    expect(genreName1).toBeTruthy();
    expect(genreName2).toBeTruthy();

    // Chọn checkbox của hai genre
    await firstRow.getByRole('checkbox').check();
    await secondRow.getByRole('checkbox').check();

    // Click nút Delete trong toolbar để xóa hàng loạt
    await page.getByRole('button', { name: 'Delete' }).click();

    // Kiểm tra thông báo thành công
    await expect(page.getByText('genre(s) deleted successfully')).toBeVisible();

    // Đợi table reload
    await page.waitForTimeout(2000);
    await waitForTableToLoad(page);

    // Kiểm tra xem genres đã bị xóa chưa
    const searchInput = page.getByPlaceholder('Search genres...');

    // Kiểm tra genre 1
    await searchInput.click();
    await searchInput.fill(genreName1 || '');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    await expect(page.locator('table tbody')).toContainText('No results');

    // Kiểm tra genre 2
    await searchInput.clear();
    await searchInput.fill(genreName2 || '');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    await expect(page.locator('table tbody')).toContainText('No results');

    // Reset search
    await searchInput.clear();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
  });

  // TC7: Admin có thể chuyển trang để xem danh sách genre ở các trang khác nhau
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
