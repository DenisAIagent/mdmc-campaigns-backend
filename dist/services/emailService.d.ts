import { User, CampaignRequest, Payment } from '@prisma/client';
interface WelcomeEmailData {
    user: User;
}
interface LinkRequestEmailData {
    user: User;
    customerId: string;
}
interface CampaignLaunchedEmailData {
    user: User;
    campaign: CampaignRequest;
}
interface PaymentConfirmationEmailData {
    user: User;
    payment: Payment & {
        campaign?: CampaignRequest;
    };
    invoiceUrl?: string;
}
interface PasswordResetEmailData {
    user: User;
    resetToken: string;
}
export declare class EmailService {
    private transporter;
    constructor();
    private verifyConnection;
    sendWelcomeEmail(data: WelcomeEmailData): Promise<void>;
    sendLinkRequestEmail(data: LinkRequestEmailData): Promise<void>;
    sendCampaignLaunchedEmail(data: CampaignLaunchedEmailData): Promise<void>;
    sendPaymentConfirmationEmail(data: PaymentConfirmationEmailData): Promise<void>;
    sendPasswordResetEmail(data: PasswordResetEmailData): Promise<void>;
    private sendEmail;
    private getWelcomeTemplate;
    private getLinkRequestTemplate;
    private getCampaignLaunchedTemplate;
    private getPaymentConfirmationTemplate;
    private getPasswordResetTemplate;
}
export declare const emailService: EmailService;
export {};
//# sourceMappingURL=emailService.d.ts.map