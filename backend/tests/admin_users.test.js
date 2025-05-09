import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter, Rate } from 'k6/metrics';

// Hardcoded BASE_URL
const BASE_URL = 'http://localhost:10000';

// Custom metrics
const failedLogins = new Counter('failed_logins_admin_users');
const successfulAdminRequests = new Rate('successful_admin_user_requests');

// Test configuration
export const options = {
  vus: 10,
  duration: '1m45s',
  thresholds: {
    http_req_failed: ['rate<0.15'],
    http_req_duration: ['p(95)<1000'],
    'http_req_duration{api:admin_login}': ['p(95)<300'],
    'http_req_duration{api:admin_get_all_users}': ['p(95)<500'],
    'http_req_duration{api:admin_delete_user}': ['p(95)<600'],
    'http_req_duration{api:admin_logout}': ['p(95)<200'],
    successful_admin_user_requests: ['rate>0.85'],
  },
};

// Shared data for admin credentials
const adminUserData = new SharedArray('admin_user_data', function () {
  return [
    {
      email: 'admin@soundwave.com',
      password: '123456',
      role: 'ADMIN'
    }
  ];
});

const adminCredentials = adminUserData[0];

// Common headers
const headers = {
  'Content-Type': 'application/json',
};

// Authenticate Admin User
function authenticateAdmin() {
  const loginPayload = JSON.stringify({
    emailOrUsername: adminCredentials.email,
    password: adminCredentials.password,
  });
  const loginResponse = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
    headers: headers,
    tags: { api: 'admin_login' },
  });

  const loginSuccess = check(loginResponse, {
    'admin login successful': (r) => r.status === 200 && r.json('token') !== undefined,
  });

  if (!loginSuccess) {
    failedLogins.add(1);
    console.error(`VU ${__VU} Iter ${__ITER}: Admin login failed. Status: ${loginResponse.status}, Body: ${loginResponse.body}`);
    return null;
  }
  try {
    return { Authorization: `Bearer ${loginResponse.json('token')}` };
  } catch (e) {
    console.error(`VU ${__VU} Iter ${__ITER}: Failed to parse admin login response: ${e}. Status: ${loginResponse.status}, Body: ${loginResponse.body}`);
    return null;
  }
}

export default function () {
  const adminAuthHeaders = authenticateAdmin();
  if (!adminAuthHeaders) {
    return;
  }
  sleep(0.5);

  // 1. Get All Users (Admin)
  const getUsersResponse = http.get(`${BASE_URL}/api/admin/users`, {
    headers: { ...headers, ...adminAuthHeaders },
    tags: { api: 'admin_get_all_users' },
  });
  const getUsersSuccess = check(getUsersResponse, {
    'admin get all users successful': (r) => r.status === 200,
  });
  successfulAdminRequests.add(getUsersSuccess ? 1 : 0);
  
  let usersList = [];
  if (getUsersSuccess) {
    try {
      usersList = getUsersResponse.json('users') || [];
      // console.log(`VU ${__VU} Iter ${__ITER}: Fetched ${usersList.length} users.`);
    } catch (e) {
      console.warn(`VU ${__VU} Iter ${__ITER}: Failed to parse users list. Body: ${getUsersResponse.body}`);
    }
  } else {
    console.error(`VU ${__VU} Iter ${__ITER}: Failed to get users list. Status: ${getUsersResponse.status}`);
  }
  sleep(0.5);

  // 2. Delete a User (Admin)
  // Filter out the admin user and select only users with role 'USER'
  const deletableUsersFromAPI = usersList.filter(
    u => u.email !== adminCredentials.email && u.role === 'USER' && u.isActive === true
  );

  if (deletableUsersFromAPI.length > 0) {
    const userToDelete = deletableUsersFromAPI[__VU % deletableUsersFromAPI.length];
    const userIdToDelete = userToDelete.id;

    console.log(`VU ${__VU} Iter ${__ITER}: Attempting to delete user: ${userToDelete.email} (ID: ${userIdToDelete})`);

    const deleteUserPayload = JSON.stringify({ reason: "K6 automated test deletion" });
    const deleteUserResponse = http.del(
      `${BASE_URL}/api/admin/users/${userIdToDelete}`,
      deleteUserPayload,
      {
        headers: { ...headers, ...adminAuthHeaders },
        tags: { api: 'admin_delete_user' },
      }
    );
    const deleteUserSuccess = check(deleteUserResponse, {
      'admin delete user successful or not found (200 or 404)': (r) => r.status === 200 || r.status === 404,
    });

    if (deleteUserResponse.status === 200) {
      successfulAdminRequests.add(1);
      console.log(`VU ${__VU} Iter ${__ITER}: Successfully deleted user ${userToDelete.email} (ID: ${userIdToDelete}). Status: ${deleteUserResponse.status}`);
    } else {
      console.warn(`VU ${__VU} Iter ${__ITER}: Failed to delete user ${userToDelete.email} (ID: ${userIdToDelete}). Status: ${deleteUserResponse.status}, Body: ${deleteUserResponse.body}`);
    }
  } else {
    console.log(`VU ${__VU} Iter ${__ITER}: No deletable users found in the fetched list after filtering.`);
  }
  sleep(0.5);

  // 3. Admin Logout
  const adminLogoutResponse = http.post(`${BASE_URL}/api/auth/logout`, null, {
    headers: { ...headers, ...adminAuthHeaders },
    tags: { api: 'admin_logout' },
  });
  const logoutSuccess = check(adminLogoutResponse, { 'admin logout successful': (r) => r.status === 200 });
  successfulAdminRequests.add(logoutSuccess ? 1 : 0);
  if (!logoutSuccess) {
    console.error(`VU ${__VU} Iter ${__ITER}: Admin logout failed. Status: ${adminLogoutResponse.status}`);
  }
  sleep(0.5);
} 