import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '@prr/database';
import { AppError } from '../middleware/error-handler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authLimiter } from '../middleware/rate-limit';
import { emailService } from '../services/email.service';

const router = Router();

// Apply rate limiting to auth routes
router.use(authLimiter);

// Validation schemas
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Step 1: Request signup (send OTP, don't create account yet)
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, name } = signupSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser && existingUser.emailVerified) {
      throw new AppError('User already exists with this email', 400);
    }

    // If unverified user exists, delete it (allow retry)
    if (existingUser && !existingUser.emailVerified) {
      await prisma.user.delete({ where: { id: existingUser.id } });
    }

    // Hash password for temporary storage
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate 6-digit OTP code (cryptographically secure)
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const verificationToken = emailService.generateVerificationToken();
    const verificationExpires = emailService.getTokenExpiry();

    // Create UNVERIFIED user (will be verified after OTP)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        verificationToken: `${verificationToken}:${otpCode}`, // Store both token and OTP
        verificationExpires,
        emailVerified: false,
        settings: {
          create: {},
        },
      },
    });

    // Send verification email with OTP (non-blocking)
    emailService.sendVerificationEmailWithOTP(email, name || null, verificationToken, otpCode).catch((err) => {
      // Email failure is logged in email service
    });

    res.json({
      message: 'Verification code sent! Please check your email and enter the 6-digit code.',
      email: email,
      requiresVerification: true,
    });
  } catch (error) {
    next(error);
  }
});

// Step 2: Verify OTP and complete signup
const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

router.post('/verify-otp', async (req, res, next) => {
  try {
    const { email, otp } = verifyOtpSchema.parse(req.body);

    // Find unverified user
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new AppError('No pending verification found for this email', 404);
    }

    if (user.emailVerified) {
      throw new AppError('Email already verified. Please login.', 400);
    }

    // Check if token expired
    if (user.verificationExpires && user.verificationExpires < new Date()) {
      // Delete expired user
      await prisma.user.delete({ where: { id: user.id } });
      throw new AppError('Verification code expired. Please sign up again.', 400);
    }

    // Extract OTP from stored token
    const [token, storedOtp] = user.verificationToken?.split(':') || [];

    if (!storedOtp || storedOtp !== otp) {
      throw new AppError('Invalid verification code', 400);
    }

    // Mark user as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationExpires: null,
      },
    });

    // Send welcome email
    emailService.sendWelcomeEmail(email, user.name).catch(() => {
      // Email failure is logged in email service
    });

    // Generate JWT
    const jwtToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: true,
      },
      token: jwtToken,
      message: 'Email verified successfully! Welcome to Forge AI.',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // Check if user has password set (for legacy users)
    if (!user.password) {
      throw new AppError('Please reset your password or contact support', 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new AppError('Invalid email or password', 401);
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new AppError('Please verify your email before logging in. Check your inbox for the verification link.', 403);
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true,
        emailVerified: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Verify email
router.get('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      throw new AppError('Verification token is required', 400);
    }

    // Find user with this token
    const user = await prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new AppError('Invalid or expired verification token', 400);
    }

    // Check if token is expired
    if (user.verificationExpires && user.verificationExpires < new Date()) {
      throw new AppError('Verification token has expired. Please request a new one.', 400);
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.json({
        message: 'Email already verified. You can now log in.',
        alreadyVerified: true,
      });
    }

    // Update user as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationExpires: null,
      },
    });

    // Send welcome email (non-blocking)
    emailService.sendWelcomeEmail(user.email, user.name).catch(() => {
      // Email failure is logged in email service
    });

    res.json({
      message: 'Email verified successfully! You can now log in.',
      verified: true,
    });
  } catch (error) {
    next(error);
  }
});

// Resend verification email
const resendSchema = z.object({
  email: z.string().email(),
});

router.post('/resend-verification', async (req, res, next) => {
  try {
    const { email } = resendSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new AppError('No account found with this email', 404);
    }

    if (user.emailVerified) {
      throw new AppError('Email is already verified', 400);
    }

    // Generate new token
    const verificationToken = emailService.generateVerificationToken();
    const verificationExpires = emailService.getTokenExpiry();

    // Update user with new token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationExpires,
      },
    });

    // Send verification email
    await emailService.sendVerificationEmail(email, user.name, verificationToken);

    res.json({
      message: 'Verification email sent! Please check your inbox.',
    });
  } catch (error) {
    next(error);
  }
});

// Request password reset
const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });

    // Don't reveal if user exists or not for security
    if (!user) {
      return res.json({
        message: 'If an account with that email exists, we sent a password reset link.',
      });
    }

    // Generate reset token
    const resetToken = emailService.generateVerificationToken();
    const resetTokenExpires = emailService.getTokenExpiry();

    // Update user with reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpires,
      },
    });

    // Send password reset email
    await emailService.sendPasswordResetEmail(email, user.name, resetToken);

    res.json({
      message: 'If an account with that email exists, we sent a password reset link.',
    });
  } catch (error) {
    next(error);
  }
});

// Reset password
const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);

    // Find user with this reset token
    const user = await prisma.user.findUnique({
      where: { resetToken: token },
    });

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    // Check if token is expired
    if (user.resetTokenExpires && user.resetTokenExpires < new Date()) {
      throw new AppError('Reset token has expired. Please request a new one.', 400);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    res.json({
      message: 'Password reset successfully! You can now log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
