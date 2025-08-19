import { Request, Response, NextFunction } from 'express';
export declare class CampaignController {
    getCampaigns(req: Request, res: Response, next: NextFunction): Promise<void>;
    getCampaign(req: Request, res: Response, next: NextFunction): Promise<void>;
    createCampaign(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateCampaign(req: Request, res: Response, next: NextFunction): Promise<void>;
    launchCampaign(req: Request, res: Response, next: NextFunction): Promise<void>;
    pauseCampaign(req: Request, res: Response, next: NextFunction): Promise<void>;
    endCampaign(req: Request, res: Response, next: NextFunction): Promise<void>;
    getCampaignKpis(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteCampaign(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const campaignController: CampaignController;
//# sourceMappingURL=campaignController.d.ts.map