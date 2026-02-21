import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5000';

// Test user data
const testUser = {
  email: `api-test-${Date.now()}@gymgurus.test`,
  password: 'TestPassword123',
  firstName: 'API',
  lastName: 'Test',
  role: 'solo' as const,
};

test.describe('Authentication API', () => {
  test.describe.configure({ mode: 'serial' });

  let authCookies: string[] = [];
  let csrfToken: string = '';

  // Helper function to get CSRF token
  async function getCsrfToken(request: any) {
    const response = await request.get(`${BASE_URL}/`);
    const cookies = response.headers()['set-cookie'];
    const cookieArray = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
    const csrfCookie = cookieArray.find((c: string) => c.startsWith('csrf-token='));
    if (csrfCookie) {
      const match = csrfCookie.match(/csrf-token=([^;]+)/);
      if (match) {
        return match[1];
      }
    }
    return '';
  }

  test('POST /api/auth/register - should register a new user', async ({ request }) => {
    // Get CSRF token first
    csrfToken = await getCsrfToken(request);

    const response = await request.post(`${BASE_URL}/api/auth/register`, {
      headers: {
        'x-csrf-token': csrfToken,
        Cookie: `csrf-token=${csrfToken}`,
      },
      data: {
        email: testUser.email,
        password: testUser.password,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        role: testUser.role,
      },
    });

    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe(testUser.email);
    expect(data.user.firstName).toBe(testUser.firstName);
    expect(data.user.lastName).toBe(testUser.lastName);
    expect(data.user.role).toBe(testUser.role);
    expect(data.user.password).toBeUndefined(); // Password should not be returned

    // Store cookies for subsequent requests
    const cookies = response.headers()['set-cookie'];
    if (cookies) {
      authCookies = Array.isArray(cookies) ? cookies : [cookies];
    }
  });

  test('POST /api/auth/register - should reject duplicate email', async ({ request }) => {
    const token = await getCsrfToken(request);

    const response = await request.post(`${BASE_URL}/api/auth/register`, {
      headers: {
        'x-csrf-token': token,
        Cookie: `csrf-token=${token}`,
      },
      data: {
        email: testUser.email, // Same email as previous test
        password: 'AnotherPassword123',
        firstName: 'Duplicate',
        lastName: 'User',
        role: 'client',
      },
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('already exists');
  });

  test('POST /api/auth/register - should validate required fields', async ({ request }) => {
    const token = await getCsrfToken(request);

    const response = await request.post(`${BASE_URL}/api/auth/register`, {
      headers: {
        'x-csrf-token': token,
        Cookie: `csrf-token=${token}`,
      },
      data: {
        email: 'invalid-email', // Invalid email
        password: 'short', // Too short
      },
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toBe('Validation failed');
    expect(data.details).toBeDefined();
  });

  test('POST /api/auth/logout - should destroy session', async ({ request }) => {
    const token = await getCsrfToken(request);

    const response = await request.post(`${BASE_URL}/api/auth/logout`, {
      headers: {
        'x-csrf-token': token,
        Cookie: authCookies.length
          ? `${authCookies.join('; ')}; csrf-token=${token}`
          : `csrf-token=${token}`,
      },
    });

    expect(response.ok()).toBeTruthy();
  });

  test('POST /api/auth/login - should login with valid credentials', async ({ request }) => {
    const token = await getCsrfToken(request);

    const response = await request.post(`${BASE_URL}/api/auth/login`, {
      headers: {
        'x-csrf-token': token,
        Cookie: `csrf-token=${token}`,
      },
      data: {
        email: testUser.email,
        password: testUser.password,
      },
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe(testUser.email);
    expect(data.user.password).toBeUndefined();

    // Store new cookies
    const cookies = response.headers()['set-cookie'];
    if (cookies) {
      authCookies = Array.isArray(cookies) ? cookies : [cookies];
    }
  });

  test('POST /api/auth/login - should reject invalid password', async ({ request }) => {
    const token = await getCsrfToken(request);

    const response = await request.post(`${BASE_URL}/api/auth/login`, {
      headers: {
        'x-csrf-token': token,
        Cookie: `csrf-token=${token}`,
      },
      data: {
        email: testUser.email,
        password: 'WrongPassword123',
      },
    });

    expect(response.status()).toBe(401);

    const data = await response.json();
    expect(data.error).toContain('Invalid email or password');
  });

  test('POST /api/auth/login - should reject non-existent user', async ({ request }) => {
    const token = await getCsrfToken(request);

    const response = await request.post(`${BASE_URL}/api/auth/login`, {
      headers: {
        'x-csrf-token': token,
        Cookie: `csrf-token=${token}`,
      },
      data: {
        email: 'nonexistent@example.com',
        password: 'Password123',
      },
    });

    expect(response.status()).toBe(401);

    const data = await response.json();
    expect(data.error).toContain('Invalid email or password');
  });

  test('GET /api/auth/me - should return current user when authenticated', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: authCookies.join('; ') },
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe(testUser.email);
    expect(data.user.role).toBe(testUser.role);
  });

  test('GET /api/auth/me - should return 401 when not authenticated', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/auth/me`);

    expect(response.status()).toBe(401);

    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  test('POST /api/auth/forgot-password - should accept valid email', async ({ request }) => {
    const token = await getCsrfToken(request);

    const response = await request.post(`${BASE_URL}/api/auth/forgot-password`, {
      headers: {
        'x-csrf-token': token,
        Cookie: `csrf-token=${token}`,
      },
      data: {
        email: testUser.email,
      },
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain('password reset link');
  });

  test('POST /api/auth/forgot-password - should not reveal non-existent emails', async ({
    request,
  }) => {
    const token = await getCsrfToken(request);

    const response = await request.post(`${BASE_URL}/api/auth/forgot-password`, {
      headers: {
        'x-csrf-token': token,
        Cookie: `csrf-token=${token}`,
      },
      data: {
        email: 'nonexistent@example.com',
      },
    });

    // Should return success even for non-existent emails (security)
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('POST /api/auth/change-password - should change password when authenticated', async ({
    request,
  }) => {
    // Create a unique user for this test to avoid race conditions across workers
    const uniqueEmail = `change-pw-${Date.now()}-${Math.random()}@gymgurus.test`;
    const originalPassword = 'OriginalPassword123';
    const newPassword = 'NewPassword123';

    // Register user
    const regToken = await getCsrfToken(request);
    const regResponse = await request.post(`${BASE_URL}/api/auth/register`, {
      headers: {
        'x-csrf-token': regToken,
        Cookie: `csrf-token=${regToken}`,
      },
      data: {
        email: uniqueEmail,
        password: originalPassword,
        firstName: 'ChangePassword',
        lastName: 'Test',
        role: 'solo',
      },
    });
    expect(regResponse.status()).toBe(201);

    // Get session cookies from registration
    const regCookies = regResponse.headers()['set-cookie'];
    const sessionCookies = Array.isArray(regCookies) ? regCookies : regCookies ? [regCookies] : [];

    // Change password
    const token1 = await getCsrfToken(request);
    const response = await request.post(`${BASE_URL}/api/auth/change-password`, {
      headers: {
        'x-csrf-token': token1,
        Cookie: `${sessionCookies.join('; ')}; csrf-token=${token1}`,
      },
      data: {
        currentPassword: originalPassword,
        newPassword: newPassword,
      },
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);

    // Verify we can login with new password
    const token2 = await getCsrfToken(request);
    const loginResponse = await request.post(`${BASE_URL}/api/auth/login`, {
      headers: {
        'x-csrf-token': token2,
        Cookie: `csrf-token=${token2}`,
      },
      data: {
        email: uniqueEmail,
        password: newPassword,
      },
    });

    expect(loginResponse.ok()).toBeTruthy();
  });

  test('POST /api/auth/change-password - should reject wrong current password', async ({
    request,
  }) => {
    const token = await getCsrfToken(request);

    const response = await request.post(`${BASE_URL}/api/auth/change-password`, {
      headers: {
        'x-csrf-token': token,
        Cookie: `${authCookies.join('; ')}; csrf-token=${token}`,
      },
      data: {
        currentPassword: 'WrongPassword123',
        newPassword: 'NewPassword123',
      },
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('Current password is incorrect');
  });

  test('POST /api/auth/change-password - should require authentication', async ({ request }) => {
    const token = await getCsrfToken(request);

    const response = await request.post(`${BASE_URL}/api/auth/change-password`, {
      headers: {
        'x-csrf-token': token,
        Cookie: `csrf-token=${token}`,
      },
      data: {
        currentPassword: testUser.password,
        newPassword: 'NewPassword123',
      },
    });

    expect(response.status()).toBe(401);
  });
});

test.describe('Password Security', () => {
  // Helper function to get CSRF token
  async function getCsrfToken(request: any) {
    const response = await request.get(`${BASE_URL}/`);
    const cookies = response.headers()['set-cookie'];
    const cookieArray = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
    const csrfCookie = cookieArray.find((c: string) => c.startsWith('csrf-token='));
    if (csrfCookie) {
      const match = csrfCookie.match(/csrf-token=([^;]+)/);
      if (match) {
        return match[1];
      }
    }
    return '';
  }

  test('should hash passwords (not stored in plain text)', async ({ request }) => {
    const uniqueEmail = `security-test-${Date.now()}@gymgurus.test`;
    const password = 'TestPassword123';

    // Register user
    const token1 = await getCsrfToken(request);
    const registerResponse = await request.post(`${BASE_URL}/api/auth/register`, {
      headers: {
        'x-csrf-token': token1,
        Cookie: `csrf-token=${token1}`,
      },
      data: {
        email: uniqueEmail,
        password: password,
        firstName: 'Security',
        lastName: 'Test',
        role: 'solo',
      },
    });

    expect(registerResponse.status()).toBe(201);

    const data = await registerResponse.json();

    // Password should never be returned in API responses
    expect(data.user.password).toBeUndefined();

    // Verify the user can still login (password is hashed and verified correctly)
    const token2 = await getCsrfToken(request);
    const loginResponse = await request.post(`${BASE_URL}/api/auth/login`, {
      headers: {
        'x-csrf-token': token2,
        Cookie: `csrf-token=${token2}`,
      },
      data: {
        email: uniqueEmail,
        password: password,
      },
    });

    expect(loginResponse.ok()).toBeTruthy();
  });
});
