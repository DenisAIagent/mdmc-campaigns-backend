import { Request, Response, NextFunction } from 'express';
export declare class GoogleController {
    generateOAuthUrl(req: Request, res: Response, next: NextFunction): Promise<void>;
    handleOAuthCallback(req: Request, res: Response, next: NextFunction): Promise<void>;
    createLinkRequest(req: Request, res: Response, next: NextFunction): Promise<void>;
    getLinkStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const googleController: GoogleController;
//# sourceMappingURL=googleController.d.ts.map