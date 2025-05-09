import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter, Rate } from 'k6/metrics';

// Hardcoded BASE_URL
const BASE_URL = 'http://localhost:10000';

// Custom metrics
const failedAdminLogins = new Counter('failed_logins_admin_artists');
const successfulAdminArtistRequests = new Rate('successful_admin_artist_requests');

// Test configuration
export const options = {
  vus: 10,
  duration: '1m45s', // Aiming for ~300 requests for the main APIs
  thresholds: {
    http_req_failed: ['rate<0.15'], // Allow for some failures, e.g., deleting already deleted entities
    http_req_duration: ['p(95)<1000'], // Overall request duration
    'http_req_duration{api:admin_login_artists}': ['p(95)<300'],
    'http_req_duration{api:admin_get_all_artists}': ['p(95)<500'],
    'http_req_duration{api:admin_delete_artist}': ['p(95)<600'], // Deletion might be slightly slower
    'http_req_duration{api:admin_logout_artists}': ['p(95)<200'],
    successful_admin_artist_requests: ['rate>0.85'],
  },
};

// Shared data - Admin credentials
const adminData = new SharedArray('admin_creds', function () {
  return [
    {
      email: 'admin@soundwave.com',
      password: '123456',
    },
  ];
});
const adminCredentials = adminData[0];

// Placeholder for artists that can be targeted for deletion.
// In a real scenario, these might be IDs or names of artists you know exist or have created for testing.
// For this script, we will fetch artists and randomly pick one.

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
    tags: { api: 'admin_login_artists' }, // Unique tag for this script's login
  });

  const loginSuccess = check(loginResponse, {
    'admin login successful (artists test)': (r) => r.status === 200 && r.json('token') !== undefined,
  });

  if (!loginSuccess) {
    failedAdminLogins.add(1);
    console.error('Admin login failed (artists test). Status: ' + loginResponse.status + ', Body: ' + loginResponse.body);
    return null;
  }
  try {
    return { Authorization: `Bearer ${loginResponse.json('token')}` };
  } catch (e) {
    console.error('Failed to parse admin login response (artists test): ' + e + '. Status: ' + loginResponse.status + ', Body: ' + loginResponse.body);
    return null;
  }
}

export default function () {
  const adminAuthHeaders = authenticateAdmin();
  if (!adminAuthHeaders) {
    return; // Cannot proceed without admin authentication
  }
  sleep(0.5);

  // 1. Get All Artists (Admin)
  const getArtistsResponse = http.get(`${BASE_URL}/api/admin/artists`, {
    headers: { ...headers, ...adminAuthHeaders },
    tags: { api: 'admin_get_all_artists' },
  });
  const getArtistsSuccess = check(getArtistsResponse, {
    'admin get all artists successful': (r) => r.status === 200,
  });
  successfulAdminArtistRequests.add(getArtistsSuccess ? 1 : 0);
  let artistsList = [];
  if (getArtistsSuccess) {
    try {
      artistsList = getArtistsResponse.json('artists') || [];
    } catch (e) {
      console.warn('Failed to parse artists list from GET /api/admin/artists. Body: ' + getArtistsResponse.body);
    }
  }
  sleep(0.5);

  // 2. Delete an Artist (Admin)
  if (artistsList.length > 0) {
    // Attempt to delete a somewhat random artist to distribute load and avoid all VUs hitting the first one
    const artistToDelete = artistsList[__VU % artistsList.length]; 
    if (artistToDelete && artistToDelete.id) {
      const deleteArtistPayload = JSON.stringify({ reason: "K6 automated test deletion" });
      const deleteArtistResponse = http.del(
        `${BASE_URL}/api/admin/artists/${artistToDelete.id}`,
        deleteArtistPayload,
        {
          headers: { ...headers, ...adminAuthHeaders },
          tags: { api: 'admin_delete_artist' },
        }
      );
      const deleteArtistSuccess = check(deleteArtistResponse, {
        'admin delete artist successful or not found': (r) => r.status === 200 || r.status === 404,
      });
      if (deleteArtistResponse.status === 200) { // Only count actual 200s as successful for the rate
        successfulAdminArtistRequests.add(1);
      }
    } else {
      // console.log(`VU ${__VU}: Could not select an artist for deletion.`);
    }
    sleep(0.5);
  }

  // 3. Admin Logout
  const adminLogoutResponse = http.post(`${BASE_URL}/api/auth/logout`, null, {
    headers: { ...headers, ...adminAuthHeaders },
    tags: { api: 'admin_logout_artists' }, // Unique tag for this script's logout
  });
  const logoutSuccess = check(adminLogoutResponse, { 'admin logout successful (artists test)': (r) => r.status === 200 });
  successfulAdminArtistRequests.add(logoutSuccess ? 1 : 0);
  sleep(0.5);
} 