import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '@prisma/client';
import { prisma } from '@/config/database';
import { redis } from '@/config/redis';
import { env } from '@/config/env';
import { AuthenticationError, ConflictError, NotFoundError } from '@/utils/errors';
import { JwtPayload, RefreshTokenPayload } from '@/types/express';

export interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthService {
  private readonly jwtSecret = env.JWT_SECRET;
  private readonly jwtRefreshSecret = env.JWT_REFRESH_SECRET;
  private readonly jwtExpiresIn = env.JWT_EXPIRES_IN;
  private readonly jwtRefreshExpiresIn = env.JWT_REFRESH_EXPIRES_IN;

  async signup(data: SignupData): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, env.BCRYPT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role || UserRole.CLIENT,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Create client account for CLIENT role
    if (user.role === UserRole.CLIENT) {
      await prisma.clientAccount.create({
        data: {
          userId: user.id,
        },
      });
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Update last login
    await this.updateLastLogin(user.id);

    return {
      user,
      ...tokens,
    };
  }

  async login(data: LoginData): Promise<AuthResponse> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    if (!user.isActive) {
      throw new AuthenticationError('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Update last login
    await this.updateLastLogin(user.id);

    // Return user without password
    const { passwordHash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as RefreshTokenPayload;

      // Check if refresh token exists in database
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        throw new AuthenticationError('Invalid or expired refresh token');
      }

      if (!storedToken.user.isActive) {
        throw new AuthenticationError('Account is deactivated');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(storedToken.user);

      // Remove old refresh token
      await prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });

      // Return user without password
      const { passwordHash, ...userWithoutPassword } = storedToken.user;

      return {
        user: userWithoutPassword,
        ...tokens,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Refresh token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid refresh token');
      }
      throw error;
    }
  }

  async logout(refreshToken: string): Promise<void> {
    // Remove refresh token from database
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });

    // Optionally, add access token to blacklist in Redis
    // This would require checking the blacklist in the auth middleware
  }

  async logoutAll(userId: string): Promise<void> {
    // Remove all refresh tokens for the user
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Logout from all devices
    await this.logoutAll(userId);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal that the user doesn't exist
      return;
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id, type: 'password_reset' },
      this.jwtSecret,
      { expiresIn: '1h' }
    );

    // Store reset token in Redis with 1 hour expiration
    await redis.set(`password_reset:${user.id}`, resetToken, 3600);

    // TODO: Send password reset email
    // await emailService.sendPasswordResetEmail(user.email, resetToken);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      // Verify reset token
      const decoded = jwt.verify(token, this.jwtSecret) as JwtPayload & { type: string };

      if (decoded.type !== 'password_reset') {
        throw new AuthenticationError('Invalid reset token');
      }

      // Check if token exists in Redis
      const storedToken = await redis.get(`password_reset:${decoded.userId}`);
      if (!storedToken || storedToken !== token) {
        throw new AuthenticationError('Invalid or expired reset token');
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);

      // Update password
      await prisma.user.update({
        where: { id: decoded.userId },
        data: { passwordHash },
      });

      // Remove reset token
      await redis.del(`password_reset:${decoded.userId}`);

      // Logout from all devices
      await this.logoutAll(decoded.userId);

    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Reset token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid reset token');
      }
      throw error;
    }
  }

  private async generateTokens(user: Omit<User, 'passwordHash'>): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    // Generate access token
    const accessTokenPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(accessTokenPayload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
    } as any);

    // Generate refresh token
    const refreshTokenPayload: Omit<RefreshTokenPayload, 'tokenId'> = {
      userId: user.id,
    };

    const refreshToken = jwt.sign(refreshTokenPayload, this.jwtRefreshSecret, {
      expiresIn: this.jwtRefreshExpiresIn,
    } as any);

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    // Clean up expired refresh tokens
    await this.cleanupExpiredTokens(user.id);

    // Get token expiration time
    const decoded = jwt.decode(accessToken) as JwtPayload;
    const expiresIn = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 0;

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  private async updateLastLogin(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  private async cleanupExpiredTokens(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: {
        userId,
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  async getUserById(userId: string): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async updateProfile(userId: string, data: Partial<Pick<User, 'firstName' | 'lastName'>>): Promise<Omit<User, 'passwordHash'>> {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }
}

export const authService = new AuthService();