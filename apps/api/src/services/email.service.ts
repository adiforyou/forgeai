import nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';

// Create transporter with SMTP config
const createTransporter = () => {
  // Check if SMTP is configured
  const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

  if (hasSmtpConfig) {
    // Use real SMTP
    console.log('📧 Email service: Using SMTP configuration');
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Development: Log emails to console
    console.log('📧 Email service: Logging to console (SMTP not configured)');
    return nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true,
    });
  }
};

const transporter = createTransporter();

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const emailService = {
  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions) {
    try {
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'Forge AI <noreply@prreviewer.com>',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      // Check if using real SMTP or console logging
      const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

      if (hasSmtpConfig) {
        console.log('✅ Email sent successfully to:', options.to);
      } else {
        console.log('📧 Email logged to console (SMTP not configured):');
        console.log('To:', options.to);
        console.log('Subject:', options.subject);
        console.log('Preview:', info.message.toString());
      }

      return info;
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Failed to send email');
    }
  },

  /**
   * Generate verification token
   */
  generateVerificationToken(): string {
    return randomBytes(32).toString('hex');
  },

  /**
   * Get verification token expiry (1 hour from now)
   */
  getTokenExpiry(): Date {
    return new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  },

  /**
   * Send email verification email with OTP
   */
  async sendVerificationEmailWithOTP(email: string, name: string | null, token: string, otpCode: string) {
    const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - Forge AI</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #e6e6e6; background-color: #121212; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 40px auto; background-color: #1d1d1d; border: 1px solid #2d2d2d; border-radius: 12px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #7320DD 0%, #5a18b0 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Verify Your Email</h1>
      <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Forge AI</p>
    </div>

    <div style="padding: 40px 30px;">
      <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">Welcome${name ? `, ${name}` : ''}!</h2>

      <p style="margin: 0 0 20px; color: #9d9d9d; font-size: 16px;">
        Enter this verification code to complete your signup:
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <div style="display: inline-block; background-color: #2d2d2d; border: 2px solid #7320DD; border-radius: 12px; padding: 20px 40px;">
          <div style="font-size: 36px; font-weight: 700; color: #7320DD; letter-spacing: 8px; font-family: 'Courier New', monospace;">
            ${otpCode}
          </div>
        </div>
      </div>

      <p style="margin: 20px 0; color: #9d9d9d; font-size: 14px; text-align: center;">
        Or click the button below to verify automatically:
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="display: inline-block; background-color: #7320DD; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Verify Email
        </a>
      </div>

      <div style="margin: 30px 0 0; padding: 20px; background-color: #2d2d2d; border-left: 4px solid #7320DD; border-radius: 6px;">
        <p style="margin: 0; color: #9d9d9d; font-size: 14px;">
          <strong style="color: #ffffff;">Security:</strong> This code expires in 1 hour. Never share it with anyone.
        </p>
      </div>
    </div>

    <div style="padding: 30px; background-color: #0d0d0d; border-top: 1px solid #2d2d2d; text-align: center;">
      <p style="margin: 0 0 10px; color: #555; font-size: 14px;">
        If you didn't request this, ignore this email.
      </p>
      <p style="margin: 0; color: #555; font-size: 12px;">
        © ${new Date().getFullYear()} Forge AI. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
Verify Your Email - Forge AI

Welcome${name ? `, ${name}` : ''}!

Your verification code is: ${otpCode}

This code expires in 1 hour.

Or verify automatically: ${verificationUrl}

If you didn't request this, ignore this email.

© ${new Date().getFullYear()} Forge AI. All rights reserved.
    `;

    await this.sendEmail({
      to: email,
      subject: `Your verification code: ${otpCode}`,
      html,
      text,
    });
  },

  /**
   * Send email verification email (legacy - for link-only verification)
   */
  async sendVerificationEmail(email: string, name: string | null, token: string) {
    const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - Forge AI</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #e6e6e6; background-color: #121212; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 40px auto; background-color: #1d1d1d; border: 1px solid #2d2d2d; border-radius: 12px; overflow: hidden;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #7320DD 0%, #5a18b0 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Forge AI</h1>
      <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">AI-Powered Code Reviews</p>
    </div>

    <!-- Body -->
    <div style="padding: 40px 30px;">
      <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">Welcome${name ? `, ${name}` : ''}!</h2>

      <p style="margin: 0 0 20px; color: #9d9d9d; font-size: 16px;">
        Thank you for signing up for Forge AI. To get started, please verify your email address by clicking the button below.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="display: inline-block; background-color: #7320DD; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background-color 0.2s;">
          Verify Email Address
        </a>
      </div>

      <p style="margin: 20px 0 0; color: #9d9d9d; font-size: 14px;">
        Or copy and paste this link into your browser:
      </p>
      <p style="margin: 10px 0 0; color: #7320DD; font-size: 14px; word-break: break-all;">
        ${verificationUrl}
      </p>

      <div style="margin: 30px 0 0; padding: 20px; background-color: #2d2d2d; border-left: 4px solid #7320DD; border-radius: 6px;">
        <p style="margin: 0; color: #9d9d9d; font-size: 14px;">
          <strong style="color: #ffffff;">Note:</strong> This verification link will expire in 1 hour for security reasons.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 30px; background-color: #0d0d0d; border-top: 1px solid #2d2d2d; text-align: center;">
      <p style="margin: 0 0 10px; color: #555; font-size: 14px;">
        If you didn't create an account with Forge AI, you can safely ignore this email.
      </p>
      <p style="margin: 0; color: #555; font-size: 12px;">
        © ${new Date().getFullYear()} Forge AI. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
Welcome to Forge AI!

Thank you for signing up${name ? `, ${name}` : ''}. Please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 1 hour.

If you didn't create an account with Forge AI, you can safely ignore this email.

© ${new Date().getFullYear()} Forge AI. All rights reserved.
    `;

    await this.sendEmail({
      to: email,
      subject: 'Verify Your Email - Forge AI',
      html,
      text,
    });
  },

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, name: string | null, token: string) {
    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - Forge AI</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #e6e6e6; background-color: #121212; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 40px auto; background-color: #1d1d1d; border: 1px solid #2d2d2d; border-radius: 12px; overflow: hidden;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #7320DD 0%, #5a18b0 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Password Reset</h1>
      <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Forge AI</p>
    </div>

    <!-- Body -->
    <div style="padding: 40px 30px;">
      <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">Reset Your Password${name ? `, ${name}` : ''}</h2>

      <p style="margin: 0 0 20px; color: #9d9d9d; font-size: 16px;">
        We received a request to reset your password for your Forge AI account. Click the button below to create a new password.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="display: inline-block; background-color: #7320DD; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background-color 0.2s;">
          Reset Password
        </a>
      </div>

      <p style="margin: 20px 0 0; color: #9d9d9d; font-size: 14px;">
        Or copy and paste this link into your browser:
      </p>
      <p style="margin: 10px 0 0; color: #7320DD; font-size: 14px; word-break: break-all;">
        ${resetUrl}
      </p>

      <div style="margin: 30px 0 0; padding: 20px; background-color: #2d2d2d; border-left: 4px solid #7320DD; border-radius: 6px;">
        <p style="margin: 0; color: #9d9d9d; font-size: 14px;">
          <strong style="color: #ffffff;">Security Note:</strong> This password reset link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 30px; background-color: #0d0d0d; border-top: 1px solid #2d2d2d; text-align: center;">
      <p style="margin: 0 0 10px; color: #555; font-size: 14px;">
        If you didn't request a password reset, please ignore this email or contact support if you have concerns.
      </p>
      <p style="margin: 0; color: #555; font-size: 12px;">
        © ${new Date().getFullYear()} Forge AI. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
Reset Your Password

Hi${name ? ` ${name}` : ''},

We received a request to reset your password for your Forge AI account. Click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.

© ${new Date().getFullYear()} Forge AI. All rights reserved.
    `;

    await this.sendEmail({
      to: email,
      subject: 'Reset Your Password - Forge AI',
      html,
      text,
    });
  },

  /**
   * Send welcome email after verification
   */
  async sendWelcomeEmail(email: string, name: string | null) {
    const dashboardUrl = `${process.env.APP_URL || 'http://localhost:3000'}/dashboard`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Forge AI</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #e6e6e6; background-color: #121212; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 40px auto; background-color: #1d1d1d; border: 1px solid #2d2d2d; border-radius: 12px; overflow: hidden;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #7320DD 0%, #5a18b0 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🎉 You're All Set!</h1>
    </div>

    <!-- Body -->
    <div style="padding: 40px 30px;">
      <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">Welcome to Forge AI${name ? `, ${name}` : ''}!</h2>

      <p style="margin: 0 0 20px; color: #9d9d9d; font-size: 16px;">
        Your email has been verified successfully. You're now ready to start using AI-powered code reviews!
      </p>

      <div style="margin: 30px 0;">
        <h3 style="margin: 0 0 15px; color: #ffffff; font-size: 18px; font-weight: 600;">Next Steps:</h3>
        <ol style="margin: 0; padding-left: 20px; color: #9d9d9d;">
          <li style="margin-bottom: 10px;">Connect your first repository (GitHub, GitLab, or Bitbucket)</li>
          <li style="margin-bottom: 10px;">Configure your AI model preferences</li>
          <li style="margin-bottom: 10px;">Set up webhooks for automatic reviews</li>
          <li style="margin-bottom: 10px;">Trigger your first manual review</li>
        </ol>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${dashboardUrl}" style="display: inline-block; background-color: #7320DD; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Go to Dashboard
        </a>
      </div>

      <div style="margin: 30px 0 0; padding: 20px; background-color: #2d2d2d; border-radius: 6px;">
        <h4 style="margin: 0 0 10px; color: #ffffff; font-size: 16px; font-weight: 600;">Features at Your Fingertips:</h4>
        <ul style="margin: 0; padding-left: 20px; color: #9d9d9d; font-size: 14px;">
          <li style="margin-bottom: 8px;">⚡ Lightning fast reviews with Gemini 2.0 Flash</li>
          <li style="margin-bottom: 8px;">🛡️ Security vulnerability detection</li>
          <li style="margin-bottom: 8px;">📊 Real-time cost and analytics tracking</li>
          <li style="margin-bottom: 8px;">🤖 Multi-model AI support (Claude, GPT-4o, Gemini)</li>
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 30px; background-color: #0d0d0d; border-top: 1px solid #2d2d2d; text-align: center;">
      <p style="margin: 0 0 10px; color: #555; font-size: 14px;">
        Need help? Check out our documentation or reach out to support.
      </p>
      <p style="margin: 0; color: #555; font-size: 12px;">
        © ${new Date().getFullYear()} Forge AI. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
🎉 You're All Set!

Welcome to Forge AI${name ? `, ${name}` : ''}!

Your email has been verified successfully. You're now ready to start using AI-powered code reviews!

Next Steps:
1. Connect your first repository (GitHub, GitLab, or Bitbucket)
2. Configure your AI model preferences
3. Set up webhooks for automatic reviews
4. Trigger your first manual review

Go to Dashboard: ${dashboardUrl}

Features at Your Fingertips:
• ⚡ Lightning fast reviews with Gemini 2.0 Flash
• 🛡️ Security vulnerability detection
• 📊 Real-time cost and analytics tracking
• 🤖 Multi-model AI support (Claude, GPT-4o, Gemini)

© ${new Date().getFullYear()} Forge AI. All rights reserved.
    `;

    await this.sendEmail({
      to: email,
      subject: 'Welcome to Forge AI! 🎉',
      html,
      text,
    });
  },
};
