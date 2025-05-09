import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter, Rate, Trend } from 'k6/metrics';

// Hardcoded BASE_URL
const BASE_URL = 'http://localhost:10000';

// Custom metrics
const failedLogins = new Counter('failed_logins');
const successfulRequests = new Rate('successful_requests');

// Test configuration
export const options = {
  vus: 10, // 10 virtual users
  duration: '5m30s', // Aiming for ~1000 requests per API (10 VUs * ~100 iterations/VU * 1 req/API/iteration)
  thresholds: {
    http_req_failed: ['rate<0.02'], // Less than 2% of requests should fail
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms overall
    'http_req_duration{api:login}': ['p(95)<300'], // Login should be faster
    'http_req_duration{api:get_me}': ['p(95)<200'], // Get Me should be fast
    'http_req_duration{api:logout}': ['p(95)<200'], // Logout should be fast
    successful_requests: ['rate>0.95'], // At least 95% of all requests should succeed
  },
};

// Shared data for consistent test executions - simplified for this script
const users = new SharedArray('users', function () {
  return [
    { email: 'admin@soundwave.com', password: '123456' },
    { email: 'sontungmtp@soundwave.com', password: '123456' },
    { email: 'vu@soundwave.com', password: '123456' },
    // Add more users if needed to distribute load, though 3 should be fine for 10 VUs.
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
    tags: { api: 'login' },
  });

  const success = check(loginResponse, {
    'login successful': (r) =>
      r.status === 200 && r.json('token') !== undefined,
  });

  if (!success) {
    failedLogins.add(1);
    console.log(
      `Login failed for user ${users[userIndex % users.length].email}. Status: ${loginResponse.status}. Body: ${loginResponse.body}`
    );
    return { authHeaders: {}, token: null };
  }

  try {
    const token = loginResponse.json('token');
    return {
      authHeaders: { Authorization: `Bearer ${token}` },
      token: token,
    };
  } catch (e) {
    console.log(
      `Failed to parse login response for user ${users[userIndex % users.length].email}: ${e}. Status: ${loginResponse.status}, Body: ${loginResponse.body}`
    );
    return { authHeaders: {}, token: null };
  }
}

export default function () {
  const userIndex = __VU % users.length;

  // 1. Login
  let auth = authenticate(userIndex);
  sleep(1); // Simulate user pausing after login

  // 2. Get current user profile (Get Me)
  if (auth.token) {
    const profileResponse = http.get(`${BASE_URL}/api/auth/me`, {
      headers: { ...headers, ...auth.authHeaders },
      tags: { api: 'get_me' },
    });

    const profileSuccess = check(profileResponse, {
      'get profile successful': (r) => r.status === 200,
    });
    successfulRequests.add(profileSuccess ? 1 : 0); // Count successful 'get_me' requests
    sleep(1); // Simulate user pausing after viewing profile
  }

  // 3. Logout
  if (auth.token) {
    const logoutResponse = http.post(`${BASE_URL}/api/auth/logout`, null, {
      headers: { ...headers, ...auth.authHeaders },
      tags: { api: 'logout' },
    });

    const logoutSuccess = check(logoutResponse, {
      'logout successful': (r) => r.status === 200,
    });
    successfulRequests.add(logoutSuccess ? 1 : 0); // Count successful 'logout' requests
    sleep(1); // Simulate user pausing after logout
  }
} 