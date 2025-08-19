import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { ValidationError } from '@/utils/errors';

export const validate = (schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }
      
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessage = error.errors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        next(new ValidationError(errorMessage));
      } else {
        next(error);
      }
    }
  };
};

// Common validation schemas
export const commonSchemas = {
  id: z.string().cuid(),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  pagination: z.object({
    page: z.string().transform(Number).pipe(z.number().int().min(1)).default('1'),
    limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).default('20'),
  }),
  googleCustomerId: z.string().regex(/^[0-9]{10}$/, 'Must be 10 digits'),
  youtubeUrl: z.string().url().refine(
    (url) => {
      const patterns = [
        /^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/,
        /^https:\/\/youtube\.com\/embed\//,
      ];
      return patterns.some(pattern => pattern.test(url));
    },
    'Must be a valid YouTube URL'
  ),
  countries: z.array(z.string().length(2).toUpperCase()),
  dateRange: z.object({
    from: z.string().transform((str) => new Date(str)).pipe(z.date()),
    to: z.string().transform((str) => new Date(str)).pipe(z.date()),
  }).refine(
    (data) => data.from <= data.to,
    'From date must be before or equal to to date'
  ),
};

// Authentication schemas
export const authSchemas = {
  signup: z.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
  }),
  
  login: z.object({
    email: commonSchemas.email,
    password: z.string(),
  }),
  
  refreshToken: z.object({
    refreshToken: z.string(),
  }),
};

// Google integration schemas
export const googleSchemas = {
  linkRequest: z.object({
    customerId: commonSchemas.googleCustomerId,
  }),
  
  oauthCallback: z.object({
    code: z.string(),
    state: z.string().optional(),
  }),
};

// Campaign schemas
export const campaignSchemas = {
  create: z.object({
    clipUrl: commonSchemas.youtubeUrl,
    clipTitle: z.string().min(1).max(100),
    artistsList: z.string().max(1000),
    countries: commonSchemas.countries.min(1),
  }),
  
  update: z.object({
    clipTitle: z.string().min(1).max(100).optional(),
    artistsList: z.string().max(1000).optional(),
    countries: commonSchemas.countries.min(1).optional(),
  }),
  
  kpisQuery: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    granularity: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  }),
};

// Billing schemas
export const billingSchemas = {
  checkoutSession: z.object({
    campaignIds: z.array(commonSchemas.id).min(1),
    successUrl: z.string().url().optional(),
    cancelUrl: z.string().url().optional(),
  }),
};

// Alert schemas
export const alertSchemas = {
  list: z.object({
    isRead: z.string().transform((val) => val === 'true').optional(),
    severity: z.enum(['INFO', 'WARNING', 'CRITICAL']).optional(),
  }),
};

// File upload validation
export const fileSchemas = {
  upload: z.object({
    file: z.object({
      mimetype: z.string(),
      size: z.number().max(10 * 1024 * 1024), // 10MB
      originalname: z.string(),
    }),
  }),
  
  csvUpload: z.object({
    file: z.object({
      mimetype: z.enum(['text/csv', 'application/vnd.ms-excel']),
      size: z.number().max(5 * 1024 * 1024), // 5MB
      originalname: z.string().regex(/\.(csv|xlsx)$/i),
    }),
  }),
};

// Helper function to extract YouTube video ID
export const extractYouTubeVideoId = (url: string): string | null => {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
};

// Middleware to validate YouTube URL and extract video ID
export const validateYouTubeUrl = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (req.body.clipUrl) {
      const videoId = extractYouTubeVideoId(req.body.clipUrl);
      if (!videoId) {
        throw new ValidationError('Invalid YouTube URL format');
      }
      req.body.youtubeVideoId = videoId;
    }
    next();
  } catch (error) {
    next(error);
  }
};

// Helper function for route validation
export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Merge validated data back to request
      if (validatedData.body) req.body = validatedData.body;
      if (validatedData.query) req.query = validatedData.query;
      if (validatedData.params) req.params = validatedData.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessage = error.errors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        next(new ValidationError(errorMessage));
      } else {
        next(error);
      }
    }
  };
};