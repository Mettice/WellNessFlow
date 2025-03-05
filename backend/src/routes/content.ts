import express, { Request, Response } from 'express';
import { z } from 'zod';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const router = express.Router();

// Database Interfaces
interface DbGeneratedContent {
  id: number;
  spa_id: string;
  type: 'text' | 'image' | 'video';
  prompt: string;
  content: string; // JSON string
  metadata: string; // JSON string
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

interface DbContentCache {
  id: number;
  cache_key: string;
  content: string; // JSON string
  content_type: string;
  expires_at: string;
  created_at: string;
}

interface DbClient {
  id: number;
  spa_id: string;
  name: string;
  email: string;
  subscription_status: string;
  created_at: string;
  updated_at: string;
}

interface DbSubscriptionPlan {
  id: number;
  name: string;
  price_id: string;
  monthly_price: number;
  features: {
    text_generation: {
      daily_limit: number;
      max_length: 'short' | 'medium' | 'long';
    };
    image_generation: {
      daily_limit: number;
      formats: ('square' | 'portrait' | 'landscape')[];
    };
    video_generation: {
      daily_limit: number;
      max_duration: '15s' | '30s' | '60s';
    };
    content_history_days: number;
    cache_duration_hours: number;
  };
}

// Add Scheduling Interface
interface DbScheduledContent {
  id: number;
  spa_id: string;
  title: string;
  content_type: 'blog' | 'social' | 'email' | 'video';
  platform: 'blog' | 'facebook' | 'instagram' | 'email';
  content: string; // JSON string
  metadata: string; // JSON string
  scheduled_for: string;
  status: 'scheduled' | 'published' | 'draft' | 'failed';
  created_at: string;
  updated_at: string;
}

// Subscription Plans Configuration
const SUBSCRIPTION_PLANS: Record<string, DbSubscriptionPlan['features']> = {
  'basic': {
    text_generation: {
      daily_limit: 50,
      max_length: 'short'
    },
    image_generation: {
      daily_limit: 25,
      formats: ['square']
    },
    video_generation: {
      daily_limit: 5,
      max_duration: '15s'
    },
    content_history_days: 7,
    cache_duration_hours: 24
  },
  'professional': {
    text_generation: {
      daily_limit: 200,
      max_length: 'medium'
    },
    image_generation: {
      daily_limit: 100,
      formats: ['square', 'portrait', 'landscape']
    },
    video_generation: {
      daily_limit: 20,
      max_duration: '30s'
    },
    content_history_days: 30,
    cache_duration_hours: 72
  },
  'enterprise': {
    text_generation: {
      daily_limit: 1000,
      max_length: 'long'
    },
    image_generation: {
      daily_limit: 500,
      formats: ['square', 'portrait', 'landscape']
    },
    video_generation: {
      daily_limit: 100,
      max_duration: '60s'
    },
    content_history_days: 90,
    cache_duration_hours: 168 // 1 week
  }
};

// Database connection
const getDb = async () => {
  return open({
    filename: 'instance/spa.db',
    driver: sqlite3.Database
  });
};

// Middleware to validate spa_id
const validateSpaId = async (req: Request, res: Response, next: Function) => {
  const spaId = req.headers['spa-id'] as string;
  
  if (!spaId) {
    return res.status(401).json({
      success: false,
      error: 'spa-id header is required'
    });
  }

  try {
    const db = await getDb();
    const client = await db.get<DbClient>(
      'SELECT * FROM clients WHERE spa_id = ? AND subscription_status = ?',
      [spaId, 'active']
    );

    if (!client) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or inactive spa-id'
      });
    }

    // Add client info to request for use in routes
    req.client = client;
    next();
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to validate spa-id'
    });
  }
};

// Rate limiting middleware
const checkRateLimit = async (req: Request, res: Response, next: Function) => {
  const { client } = req;
  if (!client) return next();

  try {
    const db = await getDb();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    
    // Get client's subscription plan
    const subscription = await db.get<{ plan_name: string }>(
      'SELECT name as plan_name FROM subscription_plans sp JOIN clients c ON c.subscription_plan = sp.price_id WHERE c.spa_id = ?',
      [client.spa_id]
    );

    if (!subscription) {
      return res.status(403).json({
        success: false,
        error: 'No active subscription plan found'
      });
    }

    const planFeatures = SUBSCRIPTION_PLANS[subscription.plan_name.toLowerCase()];
    if (!planFeatures) {
      return res.status(403).json({
        success: false,
        error: 'Invalid subscription plan'
      });
    }

    // Get today's usage
    const contentType = req.path.split('/').pop() as 'text' | 'image' | 'video';
    const usage = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM generated_content 
       WHERE spa_id = ? AND type = ? AND created_at >= ?`,
      [client.spa_id, contentType, startOfDay]
    );

    const limit = planFeatures[`${contentType}_generation`].daily_limit;
    if (usage && usage.count >= limit) {
      return res.status(429).json({
        success: false,
        error: `Daily ${contentType} generation limit reached. Upgrade your plan for higher limits.`,
        limit,
        used: usage.count,
        reset_at: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
      });
    }

    // Add plan features to request for use in routes
    req.planFeatures = planFeatures;
    next();
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to check rate limit'
    });
  }
};

// Types for API responses
interface HuggingFaceErrorResponse {
  error: string;
}

interface HuggingFaceResponse {
  ok: boolean;
  status: number;
  json(): Promise<any>;
}

// Content Types and Validation Schemas
const ContentTypeSchema = z.enum(['text', 'image', 'video']);

const GenerationOptionsSchema = z.object({
  length: z.enum(['short', 'medium', 'long']).optional(),
  style: z.enum(['professional', 'casual', 'luxury']).optional(),
  format: z.enum(['square', 'portrait', 'landscape']).optional(),
  duration: z.enum(['15s', '30s', '60s']).optional()
});

const TextGenerationSchema = z.object({
  type: z.literal('text'),
  prompt: z.string(),
  options: GenerationOptionsSchema
});

const ImageGenerationSchema = z.object({
  type: z.literal('image'),
  prompt: z.string(),
  options: GenerationOptionsSchema
});

const VideoGenerationSchema = z.object({
  type: z.literal('video'),
  prompt: z.string(),
  options: GenerationOptionsSchema
});

// Utility function for caching
const withCache = async (key: string, fn: () => Promise<any>) => {
  const db = await getDb();
  
  // Check cache
  const cached = await db.get<DbContentCache>(
    'SELECT content, expires_at FROM content_cache WHERE cache_key = ?',
    [key]
  );

  if (cached && cached.expires_at && new Date(cached.expires_at) > new Date()) {
    return JSON.parse(cached.content);
  }
  
  // Generate new content
  const data = await fn();
  
  // Cache the result
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // Cache for 1 hour

  await db.run(
    'INSERT OR REPLACE INTO content_cache (cache_key, content, content_type, expires_at) VALUES (?, ?, ?, ?)',
    [key, JSON.stringify(data), typeof data, expiresAt.toISOString()]
  );

  return data;
};

// Retry logic for model loading
const retryWithBackoff = async (
  fn: () => Promise<any>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<any> => {
  let retries = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      if (retries >= maxRetries || !error.message?.includes('Model is loading')) {
        throw error;
      }
      retries++;
      await new Promise(resolve => setTimeout(resolve, initialDelay * Math.pow(2, retries - 1)));
    }
  }
};

// Error handling for Hugging Face API responses
const handleHuggingFaceResponse = async (response: HuggingFaceResponse) => {
  if (!response.ok) {
    const error = await response.json() as HuggingFaceErrorResponse;
    if (response.status === 429) {
      throw new Error('API rate limit exceeded. Please try again later.');
    } else if (response.status === 503) {
      throw new Error('Model is loading. Please try again.');
    } else {
      throw new Error(error.error || 'Failed to generate content');
    }
  }
  return response.json();
};

// Store generated content in database
const storeGeneratedContent = async (
  spaId: string,
  type: 'text' | 'image' | 'video',
  prompt: string,
  content: any,
  metadata: any
) => {
  const db = await getDb();
  const now = new Date().toISOString();
  
  await db.run(
    `INSERT INTO generated_content 
     (spa_id, type, prompt, content, metadata, status, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [spaId, type, prompt, JSON.stringify(content), JSON.stringify(metadata), 'completed', now, now]
  );
};

// Middleware for input validation
const validateInput = (schema: z.ZodSchema) => async (req: Request, res: Response, next: Function) => {
  try {
    await schema.parseAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Invalid input data'
    });
  }
};

// Apply validateSpaId middleware to all content generation routes
router.use(['/generate/text', '/generate/image', '/generate/video', '/history'], validateSpaId);

// Apply rate limiting to generation routes
router.use(['/generate/text', '/generate/image', '/generate/video'], checkRateLimit);

// Text Generation
router.post('/generate/text', validateInput(TextGenerationSchema), async (req: Request, res: Response) => {
  try {
    const { type, prompt, options } = req.body;
    const spaId = req.headers['spa-id'] as string;
    const cacheKey = `text:${spaId}:${prompt}:${JSON.stringify(options)}`;
    
    const result = await withCache(cacheKey, async () => {
      return await retryWithBackoff(async () => {
        const response = await fetch(
          "https://api-inference.huggingface.co/models/llamameta/llama3.1-405b",
          {
            headers: {
              "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
              "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({
              inputs: prompt,
              parameters: {
                max_new_tokens: options.length === 'short' ? 100 : options.length === 'medium' ? 250 : 500,
                temperature: options.style === 'professional' ? 0.7 : options.style === 'casual' ? 0.9 : 0.8,
                top_p: 0.9,
                do_sample: true,
                return_full_text: false
              }
            }),
          }
        ) as HuggingFaceResponse;

        const data = await handleHuggingFaceResponse(response);
        await storeGeneratedContent(spaId, 'text', prompt, data.generated_text, options);
        return data;
      });
    });
    
    res.json({
      success: true,
      data: {
        text: result.generated_text,
        type,
        options
      }
    });
  } catch (error: any) {
    res.status(error.message?.includes('rate limit') ? 429 : 500).json({
      success: false,
      error: error.message || 'Failed to generate text content'
    });
  }
});

// Image Generation
router.post('/generate/image', validateInput(ImageGenerationSchema), async (req: Request, res: Response) => {
  try {
    const { prompt, options } = req.body;
    const spaId = req.headers['spa-id'] as string;
    const cacheKey = `image:${spaId}:${prompt}:${JSON.stringify(options)}`;
    
    const result = await withCache(cacheKey, async () => {
      return await retryWithBackoff(async () => {
        const response = await fetch(
          "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
          {
            headers: {
              "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
              "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({
              inputs: prompt,
              parameters: {
                negative_prompt: "blurry, bad quality, distorted",
                num_inference_steps: 30,
                guidance_scale: 7.5,
                width: options.format === 'square' ? 1024 : options.format === 'portrait' ? 768 : 1280,
                height: options.format === 'square' ? 1024 : options.format === 'portrait' ? 1280 : 768,
              }
            }),
          }
        ) as HuggingFaceResponse;

        const data = await handleHuggingFaceResponse(response);
        await storeGeneratedContent(spaId, 'image', prompt, data.image_url, options);
        return data;
      });
    });
    
    res.json({
      success: true,
      data: {
        imageUrl: result.image_url,
        options
      }
    });
  } catch (error: any) {
    res.status(error.message?.includes('rate limit') ? 429 : 500).json({
      success: false,
      error: error.message || 'Failed to generate image content'
    });
  }
});

// Video Generation
router.post('/generate/video', validateInput(VideoGenerationSchema), async (req: Request, res: Response) => {
  try {
    const { prompt, options } = req.body;
    const spaId = req.headers['spa-id'] as string;
    const cacheKey = `video:${spaId}:${prompt}:${JSON.stringify(options)}`;
    
    const result = await withCache(cacheKey, async () => {
      return await retryWithBackoff(async () => {
        const response = await fetch(
          "https://api-inference.huggingface.co/models/stabilityai/stable-video-diffusion-img2vid",
          {
            headers: {
              "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
              "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({
              inputs: prompt,
              parameters: {
                num_frames: options.duration === '15s' ? 15 : options.duration === '30s' ? 30 : 60,
                width: 1024,
                height: 576
              }
            }),
          }
        ) as HuggingFaceResponse;

        const data = await handleHuggingFaceResponse(response);
        await storeGeneratedContent(spaId, 'video', prompt, data.video_url, options);
        return data;
      });
    });
    
    res.json({
      success: true,
      data: {
        videoUrl: result.video_url,
        options
      }
    });
  } catch (error: any) {
    res.status(error.message?.includes('rate limit') ? 429 : 500).json({
      success: false,
      error: error.message || 'Failed to generate video content'
    });
  }
});

// Get generated content history
router.get('/history', async (req: Request, res: Response) => {
  try {
    const spaId = req.headers['spa-id'] as string;
    const db = await getDb();
    
    const history = await db.all<DbGeneratedContent[]>(
      `SELECT id, type, prompt, content, metadata, status, created_at 
       FROM generated_content 
       WHERE spa_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [spaId]
    );
    
    res.json({
      success: true,
      data: history.map(item => ({
        ...item,
        content: JSON.parse(item.content),
        metadata: JSON.parse(item.metadata)
      }))
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch content history'
    });
  }
});

// Content Scheduling Routes
router.post('/schedule', validateSpaId, async (req: Request, res: Response) => {
  try {
    const { title, content_type, platform, content, metadata, scheduled_for } = req.body;
    const spaId = req.headers['spa-id'] as string;
    const now = new Date().toISOString();

    const db = await getDb();
    const result = await db.run(
      `INSERT INTO scheduled_content 
       (spa_id, title, content_type, platform, content, metadata, scheduled_for, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [spaId, title, content_type, platform, JSON.stringify(content), JSON.stringify(metadata), 
       scheduled_for, 'scheduled', now, now]
    );

    res.json({
      success: true,
      data: {
        id: result.lastID,
        title,
        content_type,
        platform,
        scheduled_for,
        status: 'scheduled'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to schedule content'
    });
  }
});

router.get('/schedule', validateSpaId, async (req: Request, res: Response) => {
  try {
    const spaId = req.headers['spa-id'] as string;
    const { status, platform, date } = req.query;
    
    const db = await getDb();
    let query = `SELECT * FROM scheduled_content WHERE spa_id = ?`;
    const params: any[] = [spaId];

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }
    if (platform) {
      query += ` AND platform = ?`;
      params.push(platform);
    }
    if (date) {
      query += ` AND DATE(scheduled_for) = DATE(?)`;
      params.push(date);
    }

    query += ` ORDER BY scheduled_for ASC`;
    
    const scheduledContent = await db.all<DbScheduledContent[]>(query, params);
    
    res.json({
      success: true,
      data: scheduledContent.map(item => ({
        ...item,
        content: JSON.parse(item.content),
        metadata: JSON.parse(item.metadata)
      }))
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch scheduled content'
    });
  }
});

router.patch('/schedule/:id', validateSpaId, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const spaId = req.headers['spa-id'] as string;
    const updates = req.body;
    const now = new Date().toISOString();

    const db = await getDb();
    
    // Verify ownership
    const content = await db.get<DbScheduledContent>(
      'SELECT * FROM scheduled_content WHERE id = ? AND spa_id = ?',
      [id, spaId]
    );

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Scheduled content not found'
      });
    }

    const allowedUpdates = ['title', 'scheduled_for', 'status', 'content', 'metadata'];
    const updateFields = Object.keys(updates)
      .filter(key => allowedUpdates.includes(key))
      .map(key => `${key} = ?`);
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    const query = `
      UPDATE scheduled_content 
      SET ${updateFields.join(', ')}, updated_at = ?
      WHERE id = ? AND spa_id = ?
    `;

    const values = [
      ...updateFields.map(field => {
        const key = field.split(' = ')[0];
        return ['content', 'metadata'].includes(key) 
          ? JSON.stringify(updates[key]) 
          : updates[key];
      }),
      now,
      id,
      spaId
    ];

    await db.run(query, values);

    res.json({
      success: true,
      data: {
        id,
        ...updates,
        updated_at: now
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update scheduled content'
    });
  }
});

router.delete('/schedule/:id', validateSpaId, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const spaId = req.headers['spa-id'] as string;

    const db = await getDb();
    
    // Verify ownership
    const content = await db.get<DbScheduledContent>(
      'SELECT * FROM scheduled_content WHERE id = ? AND spa_id = ?',
      [id, spaId]
    );

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Scheduled content not found'
      });
    }

    await db.run(
      'DELETE FROM scheduled_content WHERE id = ? AND spa_id = ?',
      [id, spaId]
    );

    res.json({
      success: true,
      data: { id }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete scheduled content'
    });
  }
});

// Extend Express Request type to include client and plan features
declare global {
  namespace Express {
    interface Request {
      client?: DbClient;
      planFeatures?: DbSubscriptionPlan['features'];
    }
  }
}

export default router; 