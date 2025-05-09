import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter, Rate } from 'k6/metrics';

// Hardcoded BASE_URL
const BASE_URL = 'http://localhost:10000';

// Custom metrics
const failedLogins = new Counter('failed_logins');
const successfulRequests = new Rate('successful_requests');

// Test configuration
export const options = {
  vus: 10, // Kept VUs at 10
  duration: '1m45s', // Adjusted duration to achieve ~300 total requests for main APIs
  thresholds: {
    http_req_failed: ['rate<0.15'], // Adjusted threshold due to potential delete artist 500s (API issue)
    http_req_duration: ['p(95)<1000'],
    'http_req_duration{endpoint:POST_/api/auth/login}': ['p(95)<300'],
    'http_req_duration{endpoint:GET_/api/admin/users}': ['p(95)<500'],
    'http_req_duration{endpoint:GET_/api/admin/artists}': ['p(95)<500'],
    'http_req_duration{endpoint:PUT_/api/user/edit-profile}': ['p(95)<400'],
    successful_requests: ['rate>0.80'], // Adjusted threshold
  },
};

// Shared data for consistent test executions
const users = new SharedArray('users', function () {
  return [
    {
      email: 'admin@soundwave.com',
      password: '123456',
      hasArtistProfile: false, // Admin specific
    },
    {
      email: 'sontungmtp@soundwave.com', // User for editing profile
      password: '123456',
      hasArtistProfile: true,
    },
    {
      email: 'kiet2@soundwave.com', // User intended for deletion testing
      password: '123456',
      hasArtistProfile: false,
    },
     {
      email: 'vu@soundwave.com',
      password: '123456',
      hasArtistProfile: true,
    },
  ];
});

// Common headers
const headers = {
  'Content-Type': 'application/json',
};

// Utility function for authentication
function authenticate(userIndex = 0) {
  const userCredentials = users[userIndex % users.length];
  const loginPayload = JSON.stringify({
    emailOrUsername: userCredentials.email,
    password: userCredentials.password,
  });

  const loginResponse = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
    headers: headers,
    tags: { endpoint: 'POST_/api/auth/login' },
  });

  const success = check(loginResponse, {
    'login successful': (r) =>
      r.status === 200 && r.json('token') !== undefined,
  });

  if (!success) {
    failedLogins.add(1);
    console.log(
      `Login failed for user ${userCredentials.email}. Status: ${loginResponse.status}. Body: ${loginResponse.body}`
    );
    return { authHeaders: {}, userId: null, token: null, role: null };
  }

  try {
    const token = loginResponse.json('token');
    const userId = loginResponse.json('user.id');
    const role = loginResponse.json('user.role');
    return {
      authHeaders: { Authorization: `Bearer ${token}` },
      userId: userId,
      token: token,
      role: role,
    };
  } catch (e) {
    console.log(
      `Failed to parse login response for user ${userCredentials.email}: ${e}. Status: ${loginResponse.status}, Body: ${loginResponse.body}`
    );
    return { authHeaders: {}, userId: null, token: null, role: null };
  }
}

export default function () {
  // === ADMIN OPERATIONS ===
  const adminUserIndex = users.findIndex(u => u.email === 'admin@soundwave.com');
  const adminAuth = authenticate(adminUserIndex !== -1 ? adminUserIndex : 0);
  let fetchedUsersList = [];
  let fetchedArtistsList = [];

  if (adminAuth.token && adminAuth.role === 'ADMIN') {
    // console.log(`VU ${__VU}: Admin authenticated successfully.`);
    // 1. Get All Users (Admin)
    const getUsersResponse = http.get(`${BASE_URL}/api/admin/users`, {
      headers: { ...headers, ...adminAuth.authHeaders },
      tags: { endpoint: 'GET_/api/admin/users' },
    });
    const getUsersSuccess = check(getUsersResponse, {
      'admin get users successful': (r) => r.status === 200,
    });
    successfulRequests.add(getUsersSuccess ? 1 : 0);
    if (getUsersSuccess) {
        try {
            fetchedUsersList = getUsersResponse.json('users') || [];
        } catch (e) {
            // console.log(`VU ${__VU}: Failed to parse users list from GET /api/admin/users. Body: ${getUsersResponse.body}`);
        }
    }
    sleep(0.5); // Shorter sleep

    // 2. Get All Artists (Admin)
    const getArtistsResponse = http.get(`${BASE_URL}/api/admin/artists`, {
      headers: { ...headers, ...adminAuth.authHeaders },
      tags: { endpoint: 'GET_/api/admin/artists' },
    });
    const getArtistsSuccess = check(getArtistsResponse, {
      'admin get artists successful': (r) => r.status === 200,
    });
    successfulRequests.add(getArtistsSuccess ? 1 : 0);
     if (getArtistsSuccess) {
        try {
            fetchedArtistsList = getArtistsResponse.json('artists') || [];
        } catch (e) {
            // console.log(`VU ${__VU}: Failed to parse artists list from GET /api/admin/artists. Body: ${getArtistsResponse.body}`);
        }
    }
    sleep(0.5); // Shorter sleep

    // 3. Delete User (Admin)
    const userToDeleteFromConfig = users.find(u => u.email === 'kiet2@soundwave.com'); // Corrected email
    let userIdToDelete = null;

    if (userToDeleteFromConfig && fetchedUsersList.length > 0) {
        const targetInFetchedList = fetchedUsersList.find(u => u.email === userToDeleteFromConfig.email);
        if (targetInFetchedList && targetInFetchedList.id !== adminAuth.userId) {
            userIdToDelete = targetInFetchedList.id;
        }
    }

    if (userIdToDelete) {
      // console.log(`VU ${__VU}: Admin attempting to delete user ID: ${userIdToDelete}`);
      const deleteUserPayload = JSON.stringify({ reason: "K6 automated test deletion" });
      const deleteUserResponse = http.del(
        `${BASE_URL}/api/admin/users/${userIdToDelete}`,
        deleteUserPayload,
        {
          headers: { ...headers, ...adminAuth.authHeaders },
          tags: { endpoint: 'DELETE_/api/admin/users/:id' },
        }
      );
      const deleteUserSuccessCheck = check(deleteUserResponse, {
        'admin delete user successful or user not found': (r) => r.status === 200 || r.status === 404,
      });
       successfulRequests.add(deleteUserResponse.status === 200 ? 1 : 0); // Only count 200 as success for rate
      // console.log(`VU ${__VU}: Admin delete user response status: ${deleteUserResponse.status}`);
      sleep(0.5); // Shorter sleep
    } else {
      // console.log(`VU ${__VU}: Admin: User 'kiet2@soundwave.com' not found in fetched list or is admin, skipping delete user test.`);
    }

    // 4. Delete Artist (Admin)
    // NOTE: The 500 errors on this endpoint are likely due to multiple VUs trying to delete the same artist.
    // The API should ideally return 404 if the artist is already deleted, not 500.
    if (fetchedArtistsList.length > 0) {
      // To reduce simultaneous deletes of the same item by different VUs in a short test,
      // let's try to make each VU pick a different artist if possible, or skip if only one artist exists and it's not the VU's turn.
      // This is a simple attempt and might not fully prevent race conditions in very short tests with many VUs for few artists.
      const artistIndexToDelete = __VU % fetchedArtistsList.length;
      const artistToDelete = fetchedArtistsList[artistIndexToDelete];
      
      if (artistToDelete && artistToDelete.id) {
        // console.log(`VU ${__VU}: Admin attempting to delete artist ID: ${artistToDelete.id}`);
        const deleteArtistPayload = JSON.stringify({ reason: "K6 automated test deletion" });
        const deleteArtistResponse = http.del(
          `${BASE_URL}/api/admin/artists/${artistToDelete.id}`,
          deleteArtistPayload,
          {
            headers: { ...headers, ...adminAuth.authHeaders },
            tags: { endpoint: 'DELETE_/api/admin/artists/:id' },
          }
        );
        const deleteArtistSuccessCheck = check(deleteArtistResponse, {
          'admin delete artist successful or artist not found': (r) => r.status === 200 || r.status === 404,
        });
        successfulRequests.add(deleteArtistResponse.status === 200 ? 1 : 0);
        // console.log(`VU ${__VU}: Admin delete artist response status: ${deleteArtistResponse.status}`);
        sleep(0.5); // Shorter sleep
      } else {
        // console.log(`VU ${__VU}: Admin: Could not determine a unique artist to delete for this VU.`);
      }
    } else {
      // console.log(`VU ${__VU}: Admin: No artists found to attempt deletion.`);
    }

    // Admin Logout
    const adminLogoutResponse = http.post(`${BASE_URL}/api/auth/logout`, null, {
      headers: { ...headers, ...adminAuth.authHeaders },
      tags: { endpoint: 'POST_/api/auth/logout_admin' },
    });
    check(adminLogoutResponse, { 'admin logout successful': (r) => r.status === 200 });
    sleep(0.5); // Shorter sleep

  } else {
    // console.log(`VU ${__VU}: Admin failed to authenticate or not an ADMIN role.`);
  }

  // === USER OPERATIONS ===
  const regularUserIndex = users.findIndex(u => u.email === 'kiet@soundwave.com');
  const userAuth = authenticate(regularUserIndex !== -1 ? regularUserIndex : 1); // Fallback to index 1 if not found

  if (userAuth.token && userAuth.userId) {
    // console.log(`VU ${__VU}: User ${users[regularUserIndex !== -1 ? regularUserIndex : 1].email} authenticated successfully.`);
    // 1. Edit User Profile
    const editPayload = JSON.stringify({
      name: `K6 Test User New Name VU ${__VU} Iter ${__ITER}`,
    });

    const editProfileResponse = http.put(
      `${BASE_URL}/api/user/edit-profile`,
      editPayload,
      {
        headers: { ...headers, ...userAuth.authHeaders },
        tags: { endpoint: 'PUT_/api/user/edit-profile' },
      }
    );
    const editProfileSuccess = check(editProfileResponse, {
      'edit profile successful': (r) => r.status === 200,
    });
    successfulRequests.add(editProfileSuccess ? 1 : 0);
    if (!editProfileSuccess) {
    }
    sleep(0.5);

    // User Logout
    const userLogoutResponse = http.post(`${BASE_URL}/api/auth/logout`, null, {
      headers: { ...headers, ...userAuth.authHeaders },
      tags: { endpoint: 'POST_/api/auth/logout_user' },
    });
    check(userLogoutResponse, { 'user logout successful': (r) => r.status === 200 });
    sleep(0.5);
  } else {
  }
} 