import { User, UserRole } from '@prisma/client';
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
export declare class AuthService {
    private readonly jwtSecret;
    private readonly jwtRefreshSecret;
    private readonly jwtExpiresIn;
    private readonly jwtRefreshExpiresIn;
    signup(data: SignupData): Promise<AuthResponse>;
    login(data: LoginData): Promise<AuthResponse>;
    refreshToken(refreshToken: string): Promise<AuthResponse>;
    logout(refreshToken: string): Promise<void>;
    logoutAll(userId: string): Promise<void>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
    requestPasswordReset(email: string): Promise<void>;
    resetPassword(token: string, newPassword: string): Promise<void>;
    private generateTokens;
    private updateLastLogin;
    private cleanupExpiredTokens;
    getUserById(userId: string): Promise<Omit<User, 'passwordHash'> | null>;
    updateProfile(userId: string, data: Partial<Pick<User, 'firstName' | 'lastName'>>): Promise<Omit<User, 'passwordHash'>>;
}
export declare const authService: AuthService;
//# sourceMappingURL=authService.d.ts.map