import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { getPrisma } from '../../shared/utils/database';
import { Logger } from '../../shared/middleware/logger';
import { AppError } from '../../shared/middleware/errorHandler';
import { Prisma } from '@prisma/client';

export const attendanceRouter: Router = Router();

interface CheckInRequest {
  latitude: number;
  longitude: number;
  accuracy?: number;
  office_location_id?: string;
}

interface CheckOutRequest {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

interface AttendanceRecordsQuery {
  employee_id?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  verification_type?: string;
  page?: string;
  limit?: string;
}

// Helper function to validate latitude
const isValidLatitude = (lat: number): boolean => {
  return lat >= -90 && lat <= 90;
};

// Helper function to validate longitude
const isValidLongitude = (lon: number): boolean => {
  return lon >= -180 && lon <= 180;
};

// Helper function to calculate distance using Haversine formula
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
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Helper function to check if within geofence
const isWithinGeofence = (
  lat: number,
  lon: number,
  officeLat: number,
  officeLon: number,
  radius: number
): boolean => {
  const distance = calculateDistance(lat, lon, officeLat, officeLon);
  return distance <= radius;
};

// POST /attendance/checkin
attendanceRouter.post('/checkin', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant not specified', 400);
    }

    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const { latitude, longitude, accuracy, office_location_id }: CheckInRequest = req.body;

    // Validate required fields
    if (latitude === undefined || longitude === undefined) {
      throw new AppError('Latitude and longitude are required', 400);
    }

    // Validate latitude and longitude ranges
    if (!isValidLatitude(latitude)) {
      throw new AppError('Latitude must be between -90 and 90', 400);
    }

    if (!isValidLongitude(longitude)) {
      throw new AppError('Longitude must be between -180 and 180', 400);
    }

    // Validate check-in time is not in the future
    const now = new Date();
    if (latitude && isNaN(latitude)) {
      throw new AppError('Invalid latitude value', 400);
    }

    const prisma = getPrisma();

    // Get employee from authenticated user
    const employee = await prisma.employee.findFirst({
      where: {
        employee_id: req.user.userId,
        tenant_id: req.tenant.tenant_id
      },
      include: {
        division: {
          select: {
            division_id: true,
            name: true
          }
        },
        position: {
          select: {
            position_id: true,
            name: true
          }
        }
      }
    });

    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    if (!employee.is_active) {
      throw new AppError('Employee is not active', 400);
    }

    // Check for duplicate check-in today
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const existingCheckin = await prisma.attendanceRecord.findFirst({
      where: {
        employee_id: employee.employee_id,
        tenant_id: req.tenant.tenant_id,
        checkin_time: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    });

    if (existingCheckin) {
      throw new AppError('Employee has already checked in today', 409);
    }

    // Get company settings
    const settings = await prisma.companySettings.findUnique({
      where: { tenant_id: req.tenant.tenant_id }
    });

    const _defaultRadius = settings?.default_geofence_radius_meters || 100;

    // Get all office locations for this tenant
    const officeLocations = await prisma.officeLocation.findMany({
      where: {
        tenant_id: req.tenant.tenant_id
      }
    });

    // Determine verification type and office location
    let verification_type: 'gps' | 'manual' | 'selfie' = 'manual';
    let matchedOfficeLocation: any = null;
    let distanceFromOffice: number | null = null;

    if (office_location_id) {
      // Specific office location provided
      const specifiedLocation = officeLocations.find(
        loc => loc.location_id === office_location_id
      );

      if (!specifiedLocation) {
        throw new AppError('Specified office location not found', 404);
      }

      const isWithin = isWithinGeofence(
        latitude,
        longitude,
        Number(specifiedLocation.latitude),
        Number(specifiedLocation.longitude),
        specifiedLocation.radius_meters
      );

      if (!isWithin) {
        distanceFromOffice = calculateDistance(
          latitude,
          longitude,
          Number(specifiedLocation.latitude),
          Number(specifiedLocation.longitude)
        );

        const distanceInMeters = Math.round(distanceFromOffice);

        Logger.warn('Check-in outside specified geofence', {
          employeeId: employee.employee_id,
          distance: distanceFromOffice,
          allowedRadius: specifiedLocation.radius_meters
        });

        throw new AppError(
          `Lokasi Anda berada di luar radius geofence "${specifiedLocation.name}". Jarak Anda: ${distanceInMeters} meter (maksimum: ${specifiedLocation.radius_meters} meter). Silakan mendekat ke lokasi kantor atau hubungi administrator.`,
          400
        );
      }

      verification_type = 'gps';
      matchedOfficeLocation = specifiedLocation;
    } else {
      // Check against all office locations
      for (const office of officeLocations) {
        const isWithin = isWithinGeofence(
          latitude,
          longitude,
          Number(office.latitude),
          Number(office.longitude),
          office.radius_meters
        );

        if (isWithin) {
          verification_type = 'gps';
          matchedOfficeLocation = office;
          break;
        }
      }

      if (!matchedOfficeLocation && officeLocations.length > 0) {
        // Find closest office for logging
        let minDistance = Infinity;
        let closestOffice: any = null;
        for (const office of officeLocations) {
          const distance = calculateDistance(
            latitude,
            longitude,
            Number(office.latitude),
            Number(office.longitude)
          );
          if (distance < minDistance) {
            minDistance = distance;
            closestOffice = office;
          }
        }
        distanceFromOffice = minDistance;

        const distanceInMeters = Math.round(distanceFromOffice);

        Logger.warn('Check-in outside all geofences', {
          employeeId: employee.employee_id,
          closestDistance: distanceFromOffice,
          closestOffice: closestOffice?.name
        });

        throw new AppError(
          `Lokasi Anda berada di luar radius semua lokasi kantor. Lokasi terdekat: "${closestOffice.name}" dengan jarak ${distanceInMeters} meter (radius maksimum: ${closestOffice.radius_meters} meter). Silakan mendekat ke lokasi kantor untuk check-in.`,
          400
        );
      }
    }

    // Create attendance record
    const attendance = await prisma.attendanceRecord.create({
      data: {
        tenant_id: req.tenant.tenant_id,
        employee_id: employee.employee_id,
        checkin_time: now,
        checkin_lat: latitude,
        checkin_lon: longitude,
        checkin_accuracy: accuracy,
        verification_type,
        status: 'pending',
        office_location_id: matchedOfficeLocation?.location_id
      },
      include: {
        employee: {
          select: {
            employee_id: true,
            nip: true,
            full_name: true,
            email: true,
            division: {
              select: {
                division_id: true,
                name: true
              }
            },
            position: {
              select: {
                position_id: true,
                name: true
              }
            }
          }
        },
        office_location: true
      }
    });

    Logger.info('Attendance check-in created', {
      recordId: attendance.record_id,
      employeeId: employee.employee_id,
      verificationType: verification_type,
      location: { lat: latitude, lon: longitude }
    });

    return res.json({
      success: true,
      data: {
        ...attendance,
        distance_from_office: distanceFromOffice
      }
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Check-in failed', { error: error.message });
      return res.status(error.statusCode).json({
        success: false,
        error: {
          type: error.type,
          message: error.message
        }
      });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      Logger.error('Prisma error', { code: error.code, meta: error.meta });

      if (error.code === 'P2003') {
        return res.status(400).json({
          success: false,
          error: {
            type: 'BAD_REQUEST',
            message: 'Invalid employee or office location'
          }
        });
      }
    }

    Logger.error('Check-in error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

// POST /attendance/checkout
attendanceRouter.post('/checkout', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant not specified', 400);
    }

    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const { latitude, longitude, accuracy }: CheckOutRequest = req.body;

    const prisma = getPrisma();

    // Get employee from authenticated user
    const employee = await prisma.employee.findFirst({
      where: {
        employee_id: req.user.userId,
        tenant_id: req.tenant.tenant_id
      }
    });

    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    if (!employee.is_active) {
      throw new AppError('Employee is not active', 400);
    }

    // Find today's check-in record that hasn't been checked out yet
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const attendance = await prisma.attendanceRecord.findFirst({
      where: {
        employee_id: employee.employee_id,
        tenant_id: req.tenant.tenant_id,
        checkin_time: {
          gte: todayStart,
          lte: todayEnd
        },
        checkout_time: null
      }
    });

    if (!attendance) {
      throw new AppError('No open check-in found for today', 404);
    }

    // Validate lat/lng if provided
    if (latitude !== undefined && !isValidLatitude(latitude)) {
      throw new AppError('Latitude must be between -90 and 90', 400);
    }

    if (longitude !== undefined && !isValidLongitude(longitude)) {
      throw new AppError('Longitude must be between -180 and 180', 400);
    }

    // Update attendance record with checkout time
    const updatedAttendance = await prisma.attendanceRecord.update({
      where: {
        record_id: attendance.record_id
      },
      data: {
        checkout_time: new Date(),
        checkout_lat: latitude,
        checkout_lon: longitude,
        checkout_accuracy: accuracy
      },
      include: {
        employee: {
          select: {
            employee_id: true,
            nip: true,
            full_name: true,
            email: true
          }
        },
        office_location: true
      }
    });

    // Calculate work duration
    if (updatedAttendance.checkout_time) {
      const duration = updatedAttendance.checkout_time.getTime() -
                      updatedAttendance.checkin_time.getTime();
      const hours = Math.floor(duration / (1000 * 60 * 60));
      const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

      Logger.info('Attendance check-out completed', {
        recordId: attendance.record_id,
        duration: `${hours}h ${minutes}m`
      });
    }

    return res.json({
      success: true,
      data: updatedAttendance
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Check-out failed', { error: error.message });
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
            message: 'Attendance record not found'
          }
        });
      }
    }

    Logger.error('Check-out error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

// GET /attendance/records
attendanceRouter.get('/records', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant not specified', 400);
    }

    const query: AttendanceRecordsQuery = req.query;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      tenant_id: req.tenant.tenant_id
    };

    // Filter by employee_id
    if (query.employee_id) {
      // Validate employee exists and belongs to tenant
      const employee = await getPrisma().employee.findFirst({
        where: {
          employee_id: query.employee_id,
          tenant_id: req.tenant.tenant_id
        }
      });

      if (!employee) {
        throw new AppError('Employee not found', 400);
      }

      where.employee_id = query.employee_id;
    }

    // Filter by status
    if (query.status) {
      const validStatuses = ['pending', 'approved', 'rejected'];
      if (!validStatuses.includes(query.status)) {
        throw new AppError('Invalid status value', 400);
      }
      where.status = query.status;
    }

    // Filter by verification_type
    if (query.verification_type) {
      const validTypes = ['manual', 'gps', 'selfie', 'admin'];
      if (!validTypes.includes(query.verification_type)) {
        throw new AppError('Invalid verification_type value', 400);
      }
      where.verification_type = query.verification_type;
    }

    // Filter by date range
    if (query.start_date) {
      const startDate = new Date(String(query.start_date));
      if (isNaN(startDate.getTime())) {
        throw new AppError('Invalid start_date format', 400);
      }

      if (!where.checkin_time) {
        where.checkin_time = {};
      }
      where.checkin_time.gte = startDate;
    }

    if (query.end_date) {
      const endDate = new Date(String(query.end_date));
      if (isNaN(endDate.getTime())) {
        throw new AppError('Invalid end_date format', 400);
      }

      if (!where.checkin_time) {
        where.checkin_time = {};
      }
      where.checkin_time.lte = endDate;
    }

    const prisma = getPrisma();

    const [records, total] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where,
        select: {
          record_id: true,
          tenant_id: true,
          employee_id: true,
          checkin_time: true,
          checkout_time: true,
          checkin_lat: true,
          checkin_lon: true,
          checkin_accuracy: true,
          checkout_lat: true,
          checkout_lon: true,
          checkout_accuracy: true,
          verification_type: true,
          status: true,
          notes: true,
          office_location_id: true,
          created_at: true,
          updated_at: true,
          employee: {
            select: {
              employee_id: true,
              nip: true,
              full_name: true,
              email: true,
              division: {
                select: {
                  division_id: true,
                  name: true
                }
              },
              position: {
                select: {
                  position_id: true,
                  name: true
                }
              }
            }
          },
          office_location: {
            select: {
              location_id: true,
              name: true,
              latitude: true,
              longitude: true,
              radius_meters: true,
              is_main: true
            }
          },
          selfie_uploads: {
            select: {
              upload_id: true,
              upload_type: true,
              status: true,
              uploaded_at: true,
              image_url: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { checkin_time: 'desc' }
      }),
      prisma.attendanceRecord.count({ where })
    ]);

    Logger.info('Get attendance records', {
      count: records.length,
      total,
      page,
      limit
    });

    return res.json({
      success: true,
      data: records,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Get attendance records failed', { error: error.message });
      return res.status(error.statusCode).json({
        success: false,
        error: {
          type: error.type,
          message: error.message
        }
      });
    }

    Logger.error('Get attendance records error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

// GET /attendance/records/:id
attendanceRouter.get('/records/:id', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant not specified', 400);
    }

    const { id } = req.params;

    if (!id || id.length < 1) {
      throw new AppError('Invalid record ID', 400);
    }

    const prisma = getPrisma();
    const record = await prisma.attendanceRecord.findFirst({
      where: {
        record_id: id,
        tenant_id: req.tenant.tenant_id
      },
      select: {
        record_id: true,
        tenant_id: true,
        employee_id: true,
        checkin_time: true,
        checkout_time: true,
        checkin_lat: true,
        checkin_lon: true,
        checkin_accuracy: true,
        checkout_lat: true,
        checkout_lon: true,
        checkout_accuracy: true,
        verification_type: true,
        status: true,
        notes: true,
        office_location_id: true,
        created_at: true,
        updated_at: true,
        employee: {
          select: {
            employee_id: true,
            nip: true,
            full_name: true,
            email: true,
            phone: true,
            is_active: true,
            division: {
              select: {
                division_id: true,
                name: true,
                parent_division_id: true
              }
            },
            position: {
              select: {
                position_id: true,
                name: true,
                division_id: true
              }
            }
          }
        },
        office_location: {
          select: {
            location_id: true,
            name: true,
            latitude: true,
            longitude: true,
            radius_meters: true,
            is_main: true
          }
        },
        selfie_uploads: {
          select: {
            upload_id: true,
            upload_type: true,
            status: true,
            uploaded_at: true,
            image_url: true
          }
        }
      }
    });

    if (!record) {
      throw new AppError('Attendance record not found', 404);
    }

    Logger.info('Get attendance record', { recordId: id });

    return res.json({
      success: true,
      data: record
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Get attendance record failed', {
        recordId: req.params.id,
        error: error.message
      });
      return res.status(error.statusCode).json({
        success: false,
        error: {
          type: error.type,
          message: error.message
        }
      });
    }

    Logger.error('Get attendance record error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

// Multer configuration for selfie uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    if (!req.tenant) {
      return cb(new Error('Tenant not specified'), '');
    }

    const uploadDir = path.join(process.cwd(), 'uploads', 'selfies', req.tenant.tenant_id);

    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG images are allowed'));
    }
  }
});

// POST /attendance/:recordId/selfie
attendanceRouter.post('/:recordId/selfie',
  upload.single('selfie'),
  async (req: Request, res: Response) => {
    try {
      if (!req.tenant) {
        throw new AppError('Tenant not specified', 400);
      }

      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const { recordId } = req.params;

      if (!req.file) {
        throw new AppError('No file uploaded', 400);
      }

      const prisma = getPrisma();

      // Check if attendance record exists and belongs to tenant
      const attendance = await prisma.attendanceRecord.findFirst({
        where: {
          record_id: recordId,
          tenant_id: req.tenant.tenant_id
        },
        include: {
          employee: {
            select: {
              employee_id: true,
              full_name: true
            }
          }
        }
      });

      if (!attendance) {
        // Delete uploaded file if attendance record not found
        await fs.unlink(req.file.path).catch(() => {});
        throw new AppError('Attendance record not found', 404);
      }

      // Determine upload type based on attendance record state
      const uploadType: 'checkin' | 'checkout' = attendance.checkout_time === null ? 'checkin' : 'checkout';

      // Check if selfie already exists for this type
      const existingSelfie = await prisma.selfieUpload.findFirst({
        where: {
          attendance_record_id: recordId,
          upload_type: uploadType
        }
      });

      if (existingSelfie) {
        // Delete uploaded file if duplicate
        await fs.unlink(req.file.path).catch(() => {});
        throw new AppError(`Selfie already uploaded for ${uploadType}`, 409);
      }

      // Create selfie upload record
      const relativePath = path.relative(path.join(process.cwd(), 'uploads'), req.file.path);
      const image_url = `/uploads/${relativePath.replace(/\\/g, '/')}`;

      const selfieUpload = await prisma.selfieUpload.create({
        data: {
          attendance_record_id: recordId,
          image_url,
          upload_type: uploadType,
          status: 'pending'
        },
        select: {
          upload_id: true,
          attendance_record_id: true,
          image_url: true,
          upload_type: true,
          status: true,
          uploaded_at: true
        }
      });

      Logger.info('Selfie uploaded', {
        uploadId: selfieUpload.upload_id,
        recordId,
        employeeId: attendance.employee_id,
        uploadType
      });

      return res.status(201).json({
        success: true,
        data: selfieUpload
      });

    } catch (error: any) {
      if (error instanceof AppError) {
        Logger.warn('Selfie upload failed', { error: error.message });
        return res.status(error.statusCode).json({
          success: false,
          error: {
            type: error.type,
            message: error.message
          }
        });
      }

      if (error instanceof Error && error.message === 'Only JPEG and PNG images are allowed') {
        return res.status(400).json({
          success: false,
          error: {
            type: 'BAD_REQUEST',
            message: error.message
          }
        });
      }

      if (error instanceof Error && error.message.includes('File too large')) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'BAD_REQUEST',
            message: 'File size exceeds 5 MB limit'
          }
        });
      }

      Logger.error('Selfie upload error', error);
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL',
          message: 'Internal server error'
        }
      });
    }
  }
);

// GET /selfie/:uploadId
attendanceRouter.get('/selfie/:uploadId', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant not specified', 400);
    }

    const { uploadId } = req.params;

    const prisma = getPrisma();

    // Get selfie upload and verify it belongs to tenant via attendance record
    const selfieUpload = await prisma.selfieUpload.findFirst({
      where: {
        upload_id: uploadId
      },
      include: {
        attendance_record: {
          select: {
            tenant_id: true,
            employee: {
              select: {
                employee_id: true,
                full_name: true
              }
            }
          }
        }
      }
    });

    if (!selfieUpload) {
      throw new AppError('Selfie upload not found', 404);
    }

    // Verify tenant access
    if (selfieUpload.attendance_record.tenant_id !== req.tenant.tenant_id) {
      throw new AppError('Selfie upload not found', 404);
    }

    Logger.info('Get selfie upload', { uploadId });

    return res.json({
      success: true,
      data: {
        upload_id: selfieUpload.upload_id,
        attendance_record_id: selfieUpload.attendance_record_id,
        image_url: selfieUpload.image_url,
        upload_type: selfieUpload.upload_type,
        status: selfieUpload.status,
        uploaded_at: selfieUpload.uploaded_at
      }
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Get selfie upload failed', { uploadId: req.params.uploadId, error: error.message });
      return res.status(error.statusCode).json({
        success: false,
        error: {
          type: error.type,
          message: error.message
        }
      });
    }

    Logger.error('Get selfie upload error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

export default attendanceRouter;
