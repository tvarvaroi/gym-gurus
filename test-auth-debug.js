// Quick debug script to test auth endpoints
const BASE_URL = 'http://localhost:5000';

async function getCsrfToken() {
  const response = await fetch(`${BASE_URL}/`);
  const cookies = response.headers.get('set-cookie');
  if (!cookies) return '';

  const match = cookies.match(/csrf-token=([^;]+)/);
  return match ? match[1] : '';
}

async function testLogout() {
  console.log('\n=== Testing Logout ===');
  const token = await getCsrfToken();
  console.log('CSRF Token:', token);

  const response = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      'x-csrf-token': token,
      'Cookie': `csrf-token=${token}`,
    },
  });

  console.log('Status:', response.status);
  console.log('OK:', response.ok);
  const text = await response.text();
  console.log('Response:', text);
}

async function testLoginAfterRegister() {
  console.log('\n=== Testing Register + Login ===');

  const email = `debug-${Date.now()}@test.com`;
  const password = 'TestPassword123';

  // Register
  const regToken = await getCsrfToken();
  console.log('Register CSRF Token:', regToken);

  const regResponse = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': regToken,
      'Cookie': `csrf-token=${regToken}`,
    },
    body: JSON.stringify({
      email,
      password,
      firstName: 'Debug',
      lastName: 'User',
      role: 'solo',
    }),
  });

  console.log('Register Status:', regResponse.status);
  const regData = await regResponse.json();
  console.log('Register Response:', regData);

  // Login
  const loginToken = await getCsrfToken();
  console.log('\nLogin CSRF Token:', loginToken);

  const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': loginToken,
      'Cookie': `csrf-token=${loginToken}`,
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  console.log('Login Status:', loginResponse.status);
  console.log('Login OK:', loginResponse.ok);
  const loginText = await loginResponse.text();
  console.log('Login Response:', loginText);
}

testLogout().then(() => testLoginAfterRegister()).catch(console.error);
