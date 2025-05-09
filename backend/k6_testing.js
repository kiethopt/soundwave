import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter, Rate, Trend } from 'k6/metrics';

// Hardcoded BASE_URL
const BASE_URL = 'http://localhost:10000';

// Custom metrics
const failedLogins = new Counter('failed_logins');
const failedProfileSwitches = new Counter('failed_profile_switches');
const successfulRequests = new Rate('successful_requests');
const aiResponseTimes = new Trend('ai_response_times');

// Test configuration
export const options = {
  vus: 10, // 10 virtual users
  duration: '5m30s', // 5 minutes 30 seconds test duration
  thresholds: {
    http_req_failed: ['rate<0.02'], // Less than 2% of requests should fail
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    'http_req_duration{endpoint:POST_/api/auth/login}': ['p(95)<300'], // Login should be faster
    'http_req_duration{endpoint:POST_/api/auth/switch-profile}': ['p(95)<300'], // Profile switching should be fast
    'http_req_duration{endpoint:POST_/api/generate/playlist}': ['p(95)<3000'], // AI can be slower
    successful_requests: ['rate>0.95'], // At least 95% of all requests should succeed
  },
};

// Shared data for consistent test executions
const users = new SharedArray('users', function () {
  return [
    {
      email: 'admin@soundwave.com',
      password: '123456',
      hasArtistProfile: false,
    },
    {
      email: 'sontungmtp@soundwave.com', // Ensure this is sontungmtp@soundwave.com
      password: '123456',
      hasArtistProfile: true,
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
  const loginPayload = JSON.stringify({
    emailOrUsername: users[userIndex % users.length].email,
    password: users[userIndex % users.length].password,
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
    // Log the response body if login fails and it's not JSON, which might cause r.json() in check to fail
    if (
      loginResponse.status !== 200 ||
      !loginResponse.body ||
      typeof loginResponse.body !== 'string' ||
      !loginResponse.body.trim().startsWith('{')
    ) {
      console.log(
        `Login failed for user ${
          users[userIndex % users.length].email
        }. Status: ${loginResponse.status}. Body: ${loginResponse.body}`
      );
    }
    return { authHeaders: {}, userId: null, artistId: null, role: null };
  }

  try {
    const token = loginResponse.json('token');
    const userId = loginResponse.json('user.id');
    const role = loginResponse.json('user.role');

    return {
      authHeaders: { Authorization: `Bearer ${token}` },
      userId: userId,
      artistId: null,
      role: role,
      token: token,
    };
  } catch (e) {
    console.log(
      `Failed to parse login response for user ${
        users[userIndex % users.length].email
      }: ${e}. Status: ${loginResponse.status}, Body: ${loginResponse.body}`
    );
    return { authHeaders: {}, userId: null, artistId: null, role: null };
  }
}

export default function () {
  // Get a random user ID for this VU
  const userIndex = __VU % users.length;

  // Test group 1: Authentication APIs
  let auth = authenticate(userIndex);
  sleep(1);

  // Get current user profile
  if (auth.token) {
    // Only proceed if authentication was successful
    const profileResponse = http.get(`${BASE_URL}/api/auth/me`, {
      headers: { ...headers, ...auth.authHeaders },
      tags: { endpoint: 'GET_/api/auth/me' },
    });

    const profileSuccess = check(profileResponse, {
      'get profile successful': (r) => r.status === 200,
    });
    successfulRequests.add(profileSuccess);
    sleep(1);
  }


  // Test group 1: Logout (end session)
  if (auth.token) {
    // Only logout if authenticated
    const logoutResponse = http.post(`${BASE_URL}/api/auth/logout`, null, {
      headers: { ...headers, ...auth.authHeaders },
      tags: { endpoint: 'POST_/api/auth/logout' },
    });

    check(logoutResponse, {
      'logout successful': (r) => r.status === 200,
    });
    sleep(1);
  }
}