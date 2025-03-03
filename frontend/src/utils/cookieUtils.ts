// Hàm lưu cookie
export const setCookie = (
  name: string,
  value: string,
  options: { expires?: number; secure?: boolean; httpOnly?: boolean } = {}
) => {
  const { expires, secure = true, httpOnly = true } = options;
  let cookieString = `${name}=${encodeURIComponent(value)}; path=/`;
  if (expires) cookieString += `; max-age=${expires}`; // Thời gian hết hạn (giây)
  if (secure) cookieString += '; Secure';
  if (httpOnly) cookieString += '; HttpOnly';
  document.cookie = cookieString;
};

// Hàm đọc cookie
export const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2)
    return decodeURIComponent(parts.pop()?.split(';').shift() || '');
  return null;
};

// Hàm xóa cookie
export const deleteCookie = (name: string) => {
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
};
