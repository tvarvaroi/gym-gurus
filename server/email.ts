/**
 * Email Service
 * Handles sending transactional emails via Resend
 */

import { envConfig as env, isDev as isDevelopment } from './config/env';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send an email using Resend API
 * In development, logs email to console instead of sending
 */
async function sendEmail(options: EmailOptions): Promise<boolean> {
  const fromEmail = options.from || env.EMAIL_FROM || 'noreply@gymgurus.com';

  // In development, log email instead of sending
  if (isDevelopment || !env.RESEND_API_KEY) {
    console.log('\n📧 [EMAIL SERVICE - DEV MODE]');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`To: ${options.to}`);
    console.log(`From: ${fromEmail}`);
    console.log(`Subject: ${options.subject}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(options.html);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return true;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send email:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
  const resetUrl = `${env.APP_URL || 'http://localhost:5000'}/auth/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #c9a855 0%, #d4b870 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">GymGurus</h1>
        </div>

        <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1f2937; margin-top: 0;">Reset Your Password</h2>

          <p style="color: #4b5563; font-size: 16px;">
            We received a request to reset your password for your GymGurus account. Click the button below to create a new password:
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}"
               style="display: inline-block; background: linear-gradient(135deg, #c9a855 0%, #d4b870 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Reset Password
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
            Or copy and paste this link into your browser:
          </p>
          <p style="color: #6b7280; font-size: 14px; word-break: break-all;">
            <a href="${resetUrl}" style="color: #c9a855;">${resetUrl}</a>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

          <p style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">
            <strong>Security Notice:</strong>
          </p>
          <ul style="color: #6b7280; font-size: 14px; padding-left: 20px;">
            <li>This link will expire in <strong>1 hour</strong></li>
            <li>If you didn't request this, you can safely ignore this email</li>
            <li>Your password won't change until you create a new one</li>
          </ul>

          <p style="color: #9ca3af; font-size: 13px; margin-top: 32px; text-align: center;">
            © ${new Date().getFullYear()} GymGurus. All rights reserved.
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Reset Your GymGurus Password',
    html,
  });
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  email: string,
  verificationToken: string
): Promise<boolean> {
  const verificationUrl = `${env.APP_URL || 'http://localhost:5000'}/auth/verify-email?token=${verificationToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #c9a855 0%, #d4b870 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">GymGurus</h1>
        </div>

        <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1f2937; margin-top: 0;">Welcome to GymGurus!</h2>

          <p style="color: #4b5563; font-size: 16px;">
            Thanks for signing up! Please verify your email address to get started with your fitness journey.
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${verificationUrl}"
               style="display: inline-block; background: linear-gradient(135deg, #c9a855 0%, #d4b870 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Verify Email
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
            Or copy and paste this link into your browser:
          </p>
          <p style="color: #6b7280; font-size: 14px; word-break: break-all;">
            <a href="${verificationUrl}" style="color: #c9a855;">${verificationUrl}</a>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

          <p style="color: #6b7280; font-size: 14px;">
            If you didn't create a GymGurus account, you can safely ignore this email.
          </p>

          <p style="color: #9ca3af; font-size: 13px; margin-top: 32px; text-align: center;">
            © ${new Date().getFullYear()} GymGurus. All rights reserved.
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Verify Your GymGurus Email',
    html,
  });
}

/**
 * Send welcome email after successful registration
 */
export async function sendWelcomeEmail(
  email: string,
  firstName: string,
  role: 'trainer' | 'client' | 'solo'
): Promise<boolean> {
  const roleNames = {
    trainer: 'Guru',
    client: 'Disciple',
    solo: 'Ronin',
  };

  const roleDescriptions = {
    trainer: 'train clients and manage fitness programs',
    client: 'work with your personal trainer to achieve your goals',
    solo: 'train independently with AI-powered coaching',
  };

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to GymGurus</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #c9a855 0%, #d4b870 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Welcome to GymGurus!</h1>
        </div>

        <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1f2937; margin-top: 0;">Hi ${firstName}! 👋</h2>

          <p style="color: #4b5563; font-size: 16px;">
            Welcome to GymGurus as a <strong>${roleNames[role]}</strong>! You're all set to ${roleDescriptions[role]}.
          </p>

          <div style="background: #f9fafb; border-left: 4px solid #c9a855; padding: 16px; margin: 24px 0;">
            <h3 style="color: #1f2937; margin-top: 0; font-size: 18px;">Next Steps:</h3>
            <ul style="color: #4b5563; margin: 0; padding-left: 20px;">
              ${role === 'trainer' ? '<li>Add your first client</li><li>Create workout programs</li><li>Track client progress</li>' : ''}
              ${role === 'client' ? '<li>Complete your fitness profile</li><li>Connect with your trainer</li><li>Start your first workout</li>' : ''}
              ${role === 'solo' ? '<li>Set up your fitness goals</li><li>Generate AI workouts</li><li>Track your progress</li>' : ''}
            </ul>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${env.APP_URL || 'http://localhost:5000'}/dashboard"
               style="display: inline-block; background: linear-gradient(135deg, #c9a855 0%, #d4b870 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Go to Dashboard
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

          <p style="color: #6b7280; font-size: 14px;">
            Need help getting started? Check out our <a href="${env.APP_URL || 'http://localhost:5000'}/help" style="color: #c9a855;">help center</a> or reply to this email.
          </p>

          <p style="color: #9ca3af; font-size: 13px; margin-top: 32px; text-align: center;">
            © ${new Date().getFullYear()} GymGurus. All rights reserved.
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Welcome to GymGurus, ${firstName}!`,
    html,
  });
}
