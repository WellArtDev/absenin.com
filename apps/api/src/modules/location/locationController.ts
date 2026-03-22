import { Router, Request, Response } from 'express';
import { getPrisma } from '../../shared/utils/database';
import { Logger } from '../../shared/middleware/logger';
import { AppError } from '../../shared/middleware/errorHandler';
import { Prisma } from '@prisma/client';

export const locationRouter: Router = Router();

interface CreateLocationRequest {
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_main?: boolean;
}

interface UpdateLocationRequest {
  name?: string;
  latitude?: number;
  longitude?: number;
  radius_meters?: number;
  is_main?: boolean;
}

interface ListLocationsQuery {
  search?: string;
  is_main?: string;
  lat?: string;
  lng?: string;
}

// Helper function to calculate distance between two points (Haversine formula)
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Simple in-memory rate limiter (for production, use Redis or similar)
const rateLimiter = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (identifier: string, limit: number, windowMs: number): boolean => {
  const now = Date.now();
  const record = rateLimiter.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimiter.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
};

// Sanitize numeric input
const sanitizeNumber = (value: any, min: number, max: number): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const num = typeof value === 'string' ? parseFloat(value.trim()) : Number(value);

  if (isNaN(num)) {
    return null;
  }

  if (num < min || num > max) {
    return null;
  }

  return num;
};

// Validation helper
const validateLocationData = (data: Partial<CreateLocationRequest | UpdateLocationRequest>): void => {
  if (data.latitude !== undefined) {
    if (typeof data.latitude !== 'number' || isNaN(data.latitude)) {
      throw new AppError('Latitude must be a valid number', 400);
    }
    if (data.latitude < -90 || data.latitude > 90) {
      throw new AppError('Latitude must be between -90 and 90', 400);
    }
  }

  if (data.longitude !== undefined) {
    if (typeof data.longitude !== 'number' || isNaN(data.longitude)) {
      throw new AppError('Longitude must be a valid number', 400);
    }
    if (data.longitude < -180 || data.longitude > 180) {
      throw new AppError('Longitude must be between -180 and 180', 400);
    }
  }

  if (data.radius_meters !== undefined) {
    if (typeof data.radius_meters !== 'number' || isNaN(data.radius_meters)) {
      throw new AppError('Radius must be a valid number', 400);
    }
    if (!Number.isInteger(data.radius_meters) || data.radius_meters <= 0) {
      throw new AppError('Radius must be a positive integer', 400);
    }
  }
};

// POST /locations/create
locationRouter.post('/create', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant not specified', 400);
    }

    // Rate limiting: max 10 creates per minute per tenant
    const rateLimitKey = `create:${req.tenant.tenant_id}`;
    if (!checkRateLimit(rateLimitKey, 10, 60 * 1000)) {
      throw new AppError('Terlalu banyak permintaan. Silakan coba lagi dalam 1 menit', 429);
    }

    const data: CreateLocationRequest = req.body;

    // Validate required fields
    if (!data.name || data.name.trim() === '') {
      throw new AppError('Nama lokasi wajib diisi', 400);
    }

    if (data.latitude === undefined || data.longitude === undefined || data.radius_meters === undefined) {
      throw new AppError('Latitude, longitude, dan radius wajib diisi', 400);
    }

    // Validate data types and ranges
    validateLocationData(data);

    const prisma = getPrisma();

    // Check if setting as main location
    const isMain = data.is_main === true;
    if (isMain) {
      // Remove main flag from existing main location
      await prisma.officeLocation.updateMany({
        where: {
          tenant_id: req.tenant.tenant_id,
          is_main: true
        },
        data: { is_main: false }
      });
    }

    // Create office location
    const location = await prisma.officeLocation.create({
      data: {
        tenant_id: req.tenant.tenant_id,
        name: data.name.trim(),
        latitude: new Prisma.Decimal(data.latitude),
        longitude: new Prisma.Decimal(data.longitude),
        radius_meters: data.radius_meters,
        is_main: isMain
      },
      select: {
        location_id: true,
        name: true,
        latitude: true,
        longitude: true,
        radius_meters: true,
        is_main: true,
        created_at: true
      }
    });

    Logger.info('Office location created', {
      locationId: location.location_id,
      name: data.name
    });

    return res.status(201).json({
      success: true,
      data: location
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Create location failed', { error: error.message });
      return res.status(error.statusCode).json({
        success: false,
        error: {
          type: error.type,
          message: error.message
        }
      });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          error: {
            type: 'CONFLICT',
            message: 'A location with this name already exists'
          }
        });
      }
    }

    Logger.error('Create location error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

// GET /locations
locationRouter.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant not specified', 400);
    }

    const query: ListLocationsQuery = req.query;
    const prisma = getPrisma();

    // Build where clause
    const where: any = {
      tenant_id: req.tenant.tenant_id
    };

    if (query.search) {
      where.name = {
        contains: query.search,
        mode: 'insensitive'
      };
    }

    if (query.is_main !== undefined) {
      where.is_main = query.is_main === 'true';
    }

    const locations = await prisma.officeLocation.findMany({
      where,
      orderBy: [
        { is_main: 'desc' },
        { created_at: 'desc' }
      ],
      select: {
        location_id: true,
        name: true,
        latitude: true,
        longitude: true,
        radius_meters: true,
        is_main: true,
        created_at: true
      }
    });

    // Calculate distances if lat/lng provided
    let locationsWithDistance = locations;
    if (query.lat && query.lng) {
      const lat = parseFloat(query.lat);
      const lng = parseFloat(query.lng);

      if (!isNaN(lat) && !isNaN(lng)) {
        locationsWithDistance = locations.map((location: any) => {
          const locationLat = parseFloat(location.latitude.toString());
          const locationLng = parseFloat(location.longitude.toString());
          const distance = calculateDistance(lat, lng, locationLat, locationLng);

          return {
            ...location,
            distance_from_point: Math.round(distance)
          };
        });
      }
    }

    Logger.info('Get office locations', { count: locations.length });

    return res.json({
      success: true,
      data: locationsWithDistance
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Get locations failed', { error: error.message });
      return res.status(error.statusCode).json({
        success: false,
        error: {
          type: error.type,
          message: error.message
        }
      });
    }

    Logger.error('Get locations error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

// GET /locations/:id
locationRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant not specified', 400);
    }

    const { id } = req.params;

    const prisma = getPrisma();
    const location = await prisma.officeLocation.findFirst({
      where: {
        location_id: id,
        tenant_id: req.tenant.tenant_id
      },
      select: {
        location_id: true,
        name: true,
        latitude: true,
        longitude: true,
        radius_meters: true,
        is_main: true,
        created_at: true
      }
    });

    if (!location) {
      throw new AppError('Location not found', 404);
    }

    Logger.info('Get location details', { locationId: id });

    return res.json({
      success: true,
      data: location
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Get location failed', { id: req.params.id, error: error.message });
      return res.status(error.statusCode).json({
        success: false,
        error: {
          type: error.type,
          message: error.message
        }
      });
    }

    Logger.error('Get location error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

// PATCH /locations/:id
locationRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant not specified', 400);
    }

    // Rate limiting: max 30 updates per minute per tenant
    const rateLimitKey = `update:${req.tenant.tenant_id}`;
    if (!checkRateLimit(rateLimitKey, 30, 60 * 1000)) {
      throw new AppError('Terlalu banyak permintaan. Silakan coba lagi dalam 1 menit', 429);
    }

    const { id } = req.params;
    const updates: UpdateLocationRequest = req.body;

    if (Object.keys(updates).length === 0) {
      throw new AppError('Tidak ada field yang akan diupdate', 400);
    }

    // Validate name if provided
    if (updates.name !== undefined && updates.name.trim() === '') {
      throw new AppError('Nama lokasi tidak boleh kosong', 400);
    }

    // Validate other fields
    validateLocationData(updates);

    const prisma = getPrisma();

    // Check if location exists and belongs to tenant
    const existingLocation = await prisma.officeLocation.findFirst({
      where: {
        location_id: id,
        tenant_id: req.tenant.tenant_id
      }
    });

    if (!existingLocation) {
      throw new AppError('Location not found', 404);
    }

    // If setting as main, remove from other main location
    if (updates.is_main === true) {
      await prisma.officeLocation.updateMany({
        where: {
          tenant_id: req.tenant.tenant_id,
          location_id: { not: id },
          is_main: true
        },
        data: { is_main: false }
      });
    }

    // Build update data
    const updateData: any = {};
    if (updates.name !== undefined) {
      updateData.name = updates.name.trim();
    }
    if (updates.latitude !== undefined) {
      updateData.latitude = new Prisma.Decimal(updates.latitude);
    }
    if (updates.longitude !== undefined) {
      updateData.longitude = new Prisma.Decimal(updates.longitude);
    }
    if (updates.radius_meters !== undefined) {
      updateData.radius_meters = updates.radius_meters;
    }
    if (updates.is_main !== undefined) {
      updateData.is_main = updates.is_main;
    }

    const location = await prisma.officeLocation.update({
      where: { location_id: id },
      data: updateData,
      select: {
        location_id: true,
        name: true,
        latitude: true,
        longitude: true,
        radius_meters: true,
        is_main: true,
        created_at: true
      }
    });

    Logger.info('Location updated', { locationId: id });

    return res.json({
      success: true,
      data: location
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Update location failed', { id: req.params.id, error: error.message });
      return res.status(error.statusCode).json({
        success: false,
        error: {
          type: error.type,
          message: error.message
        }
      });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Location not found'
          }
        });
      }
    }

    Logger.error('Update location error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

// DELETE /locations/:id
locationRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant not specified', 400);
    }

    // Rate limiting: max 10 deletes per minute per tenant
    const rateLimitKey = `delete:${req.tenant.tenant_id}`;
    if (!checkRateLimit(rateLimitKey, 10, 60 * 1000)) {
      throw new AppError('Terlalu banyak permintaan. Silakan coba lagi dalam 1 menit', 429);
    }

    const { id } = req.params;

    const prisma = getPrisma();

    // Check if location exists and belongs to tenant
    const existingLocation = await prisma.officeLocation.findFirst({
      where: {
        location_id: id,
        tenant_id: req.tenant.tenant_id
      }
    });

    if (!existingLocation) {
      throw new AppError('Location not found', 404);
    }

    // Check if location is being used by attendance records
    const attendanceCount = await prisma.attendanceRecord.count({
      where: { office_location_id: id }
    });

    if (attendanceCount > 0) {
      throw new AppError(
        `Cannot delete location. It is being used by ${attendanceCount} attendance record(s)`,
        409
      );
    }

    // Delete the location
    await prisma.officeLocation.delete({
      where: { location_id: id }
    });

    Logger.info('Location deleted', { locationId: id });

    return res.json({
      success: true,
      message: 'Location deleted successfully'
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Delete location failed', { id: req.params.id, error: error.message });
      return res.status(error.statusCode).json({
        success: false,
        error: {
          type: error.type,
          message: error.message
        }
      });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Location not found'
          }
        });
      }
    }

    Logger.error('Delete location error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

// POST /locations/validate-presence
// Validate if user is within geofence of any office location
locationRouter.post('/validate-presence', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant not specified', 400);
    }

    const { latitude, longitude, location_id } = req.body;

    // Validate and sanitize inputs
    if (latitude === undefined || latitude === null) {
      throw new AppError('Latitude wajib diisi', 400);
    }

    if (longitude === undefined || longitude === null) {
      throw new AppError('Longitude wajib diisi', 400);
    }

    const sanitizedLat = sanitizeNumber(latitude, -90, 90);
    const sanitizedLon = sanitizeNumber(longitude, -180, 180);

    if (sanitizedLat === null) {
      throw new AppError('Latitude harus antara -90 dan 90', 400);
    }

    if (sanitizedLon === null) {
      throw new AppError('Longitude harus antara -180 dan 180', 400);
    }

    const prisma = getPrisma();

    // If location_id provided, validate against that specific location
    if (location_id) {
      const location = await prisma.officeLocation.findFirst({
        where: {
          location_id: location_id,
          tenant_id: req.tenant.tenant_id
        },
        select: {
          location_id: true,
          name: true,
          latitude: true,
          longitude: true,
          radius_meters: true,
          is_main: true
        }
      });

      if (!location) {
        throw new AppError('Lokasi kantor tidak ditemukan', 404);
      }

      const locationLat = parseFloat(location.latitude.toString());
      const locationLon = parseFloat(location.longitude.toString());
      const distance = calculateDistance(sanitizedLat, sanitizedLon, locationLat, locationLon);
      const isWithinRadius = distance <= location.radius_meters;

      Logger.info('Location validation (specific)', {
        tenantId: req.tenant.tenant_id,
        locationId: location_id,
        isWithinRadius,
        distance
      });

      return res.json({
        success: true,
        data: {
          is_within_radius: isWithinRadius,
          distance_meters: Math.round(distance),
          allowed_radius_meters: location.radius_meters,
          location_name: location.name,
          location_id: location.location_id,
          is_main: location.is_main,
          coordinates: {
            user: { latitude: sanitizedLat, longitude: sanitizedLon },
            location: { latitude: locationLat, longitude: locationLon }
          },
          message: isWithinRadius
            ? 'Anda berada dalam radius lokasi kantor'
            : `Anda berada di luar radius lokasi kantor. Jarak Anda: ${Math.round(distance)} meter (maksimum: ${location.radius_meters} meter)`
        }
      });
    }

    // Check against all office locations
    const locations = await prisma.officeLocation.findMany({
      where: {
        tenant_id: req.tenant.tenant_id
      },
      select: {
        location_id: true,
        name: true,
        latitude: true,
        longitude: true,
        radius_meters: true,
        is_main: true
      },
      orderBy: [
        { is_main: 'desc' },
        { created_at: 'desc' }
      ]
    });

    if (locations.length === 0) {
      throw new AppError('Belum ada lokasi kantor yang terdaftar', 404);
    }

    // Find all locations within range
    const locationsWithinRange: any[] = [];
    let closestLocation: any = null;
    let minDistance = Infinity;

    for (const location of locations) {
      const locationLat = parseFloat(location.latitude.toString());
      const locationLon = parseFloat(location.longitude.toString());
      const distance = calculateDistance(sanitizedLat, sanitizedLon, locationLat, locationLon);

      if (distance < minDistance) {
        minDistance = distance;
        closestLocation = {
          ...location,
          distance_from_user: Math.round(distance)
        };
      }

      if (distance <= location.radius_meters) {
        locationsWithinRange.push({
          location_id: location.location_id,
          name: location.name,
          distance_meters: Math.round(distance),
          allowed_radius_meters: location.radius_meters,
          is_main: location.is_main
        });
      }
    }

    // Prioritize main location if user is within its range
    const mainLocation = locations.find(l => l.is_main);
    const isWithinMainRange = mainLocation && locationsWithinRange.some(l => l.location_id === mainLocation.location_id);

    const matchedLocation = isWithinMainRange
      ? locationsWithinRange.find(l => l.is_main)
      : locationsWithinRange.length > 0
        ? locationsWithinRange[0]
        : null;

    const result = {
      is_within_radius: matchedLocation !== null,
      matched_location: matchedLocation,
      closest_location: closestLocation,
      all_locations_within_range: locationsWithinRange,
      total_locations_checked: locations.length,
      coordinates: {
        user: { latitude: sanitizedLat, longitude: sanitizedLon }
      }
    };

    let message = '';
    if (matchedLocation) {
      message = `Anda berada dalam radius ${matchedLocation.name} (${matchedLocation.distance_meters} meter dari ${matchedLocation.allowed_radius_meters} meter maksimum)`;
    } else {
      message = `Anda berada di luar radius semua lokasi kantor. Lokasi terdekat: ${closestLocation.name} (${Math.round(minDistance)} meter, maksimum: ${closestLocation.radius_meters} meter)`;
    }

    Logger.info('Location validation (all locations)', {
      tenantId: req.tenant.tenant_id,
      isWithinRadius: matchedLocation !== null,
      closestDistance: minDistance
    });

    return res.json({
      success: true,
      data: {
        ...result,
        message
      }
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Location validation failed', { error: error.message });
      return res.status(error.statusCode).json({
        success: false,
        error: {
          type: error.type,
          message: error.message
        }
      });
    }

    Logger.error('Location validation error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Terjadi kesalahan saat memvalidasi lokasi'
      }
    });
  }
});

export default locationRouter;
