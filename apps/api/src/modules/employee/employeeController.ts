import { Router, Request, Response } from 'express';
import { getPrisma } from '../../shared/utils/database';
import { Logger } from '../../shared/middleware/logger';
import { AppError } from '../../shared/middleware/errorHandler';
import { Prisma } from '@prisma/client';

export const employeeRouter: Router = Router();

interface CreateEmployeeRequest {
  nip: string;
  full_name: string;
  email?: string;
  phone?: string;
  division_id?: string;
  position_id?: string;
}

interface UpdateEmployeeRequest {
  full_name?: string;
  email?: string;
  phone?: string;
  division_id?: string;
  position_id?: string;
  is_active?: boolean;
}

interface ListEmployeesQuery {
  page?: string;
  limit?: string;
  search?: string;
  division_id?: string;
  position_id?: string;
  is_active?: string;
}

// Helper function to validate foreign keys
const validateForeignKeys = async (
  tenantId: string,
  divisionId?: string,
  positionId?: string
): Promise<void> => {
  const prisma = getPrisma();

  if (divisionId) {
    const division = await prisma.division.findFirst({
      where: {
        division_id: divisionId,
        tenant_id: tenantId
      }
    });

    if (!division) {
      throw new AppError('Division not found in this tenant', 400);
    }
  }

  if (positionId) {
    const position = await prisma.position.findFirst({
      where: {
        position_id: positionId,
        tenant_id: tenantId
      }
    });

    if (!position) {
      throw new AppError('Position not found in this tenant', 400);
    }
  }
};

// POST /employees/create
employeeRouter.post('/create', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant not specified', 400);
    }

    const { nip, full_name, email, phone, division_id, position_id }: CreateEmployeeRequest = req.body;

    // Validate required fields
    if (!nip || !full_name) {
      throw new AppError('NIP and full name are required', 400);
    }

    if (division_id && !position_id) {
      throw new AppError('Position is required when division is specified', 400);
    }

    const prisma = getPrisma();

    // Check if NIP already exists in this tenant
    const existingNip = await prisma.employee.findFirst({
      where: {
        nip,
        tenant_id: req.tenant.tenant_id
      }
    });

    if (existingNip) {
      throw new AppError('NIP already exists in this tenant', 409);
    }

    // Check if email already exists in this tenant (if provided)
    if (email) {
      const existingEmail = await prisma.employee.findFirst({
        where: {
          email,
          tenant_id: req.tenant.tenant_id
        }
      });

      if (existingEmail) {
        throw new AppError('Email already exists in this tenant', 409);
      }
    }

    // Validate foreign keys
    await validateForeignKeys(req.tenant.tenant_id, division_id, position_id);

    // Create employee
    const employee = await prisma.employee.create({
      data: {
        tenant_id: req.tenant.tenant_id,
        nip,
        full_name,
        email,
        phone,
        division_id,
        position_id,
        is_active: true
      },
      select: {
        employee_id: true,
        tenant_id: true,
        nip: true,
        full_name: true,
        email: true,
        phone: true,
        division_id: true,
        position_id: true,
        is_active: true,
        created_at: true,
        updated_at: true,
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

    Logger.info('Employee created', { employeeId: employee.employee_id, name: full_name });

    return res.json({
      success: true,
      data: employee
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Create employee failed', { error: error.message });
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

      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          error: {
            type: 'BAD_REQUEST',
            message: 'Employee with this NIP or email already exists'
          }
        });
      }

      if (error.code === 'P2003') {
        return res.status(400).json({
          success: false,
          error: {
            type: 'BAD_REQUEST',
            message: 'Invalid division or position'
          }
        });
      }
    }

    Logger.error('Create employee error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

// GET /employees
employeeRouter.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant not specified', 400);
    }

    const query: ListEmployeesQuery = req.query;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      tenant_id: req.tenant.tenant_id
    };

    // Filter by is_active if specified
    if (query.is_active !== undefined) {
      where.is_active = query.is_active === 'true';
    }

    // Filter by division_id
    if (query.division_id) {
      where.division_id = query.division_id;
    }

    // Filter by position_id
    if (query.position_id) {
      where.position_id = query.position_id;
    }

    // Search by name, nip, or email
    if (query.search) {
      where.OR = [
        { full_name: { contains: query.search, mode: 'insensitive' } },
        { nip: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } }
      ];
    }

    const prisma = getPrisma();

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        select: {
          employee_id: true,
          tenant_id: true,
          nip: true,
          full_name: true,
          email: true,
          phone: true,
          division_id: true,
          position_id: true,
          is_active: true,
          created_at: true,
          updated_at: true,
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
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' }
      }),
      prisma.employee.count({ where })
    ]);

    Logger.info('Get employees list', {
      count: employees.length,
      total,
      page,
      limit
    });

    return res.json({
      success: true,
      data: employees,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Get employees failed', { error: error.message });
      return res.status(error.statusCode).json({
        success: false,
        error: {
          type: error.type,
          message: error.message
        }
      });
    }

    Logger.error('Get employees error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

// GET /employees/:id
employeeRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant not specified', 400);
    }

    const { id } = req.params;

    const prisma = getPrisma();
    const employee = await prisma.employee.findFirst({
      where: {
        employee_id: id,
        tenant_id: req.tenant.tenant_id
      },
      select: {
        employee_id: true,
        tenant_id: true,
        nip: true,
        full_name: true,
        email: true,
        phone: true,
        division_id: true,
        position_id: true,
        is_active: true,
        created_at: true,
        updated_at: true,
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
        },
        user: {
          select: {
            user_id: true,
            email: true,
            is_active: true
          }
        }
      }
    });

    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    Logger.info('Get employee details', { employeeId: id });

    return res.json({
      success: true,
      data: employee
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Get employee failed', { employeeId: req.params.id, error: error.message });
      return res.status(error.statusCode).json({
        success: false,
        error: {
          type: error.type,
          message: error.message
        }
      });
    }

    Logger.error('Get employee error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

// PATCH /employees/:id
employeeRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant not specified', 400);
    }

    const { id } = req.params;
    const updates: UpdateEmployeeRequest = req.body;

    if (Object.keys(updates).length === 0) {
      throw new AppError('No fields to update', 400);
    }

    const prisma = getPrisma();

    // Check if employee exists and belongs to tenant
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        employee_id: id,
        tenant_id: req.tenant.tenant_id
      }
    });

    if (!existingEmployee) {
      throw new AppError('Employee not found', 404);
    }

    // Check if new nip already exists (if being updated)
    if (updates.full_name !== undefined && updates.full_name === '') {
      throw new AppError('Full name cannot be empty', 400);
    }

    // Validate division and position if provided
    if (updates.division_id || updates.position_id) {
      await validateForeignKeys(
        req.tenant.tenant_id,
        updates.division_id || existingEmployee.division_id,
        updates.position_id || existingEmployee.position_id
      );
    }

    // Check if new email already exists (if being updated and different from current)
    if (updates.email && updates.email !== existingEmployee.email) {
      const existingEmail = await prisma.employee.findFirst({
        where: {
          email: updates.email,
          tenant_id: req.tenant.tenant_id,
          employee_id: { not: id } // Exclude current employee
        }
      });

      if (existingEmail) {
        throw new AppError('Email already exists in this tenant', 409);
      }
    }

    // Update employee
    const employee = await prisma.employee.update({
      where: {
        employee_id: id
      },
      data: updates,
      select: {
        employee_id: true,
        tenant_id: true,
        nip: true,
        full_name: true,
        email: true,
        phone: true,
        division_id: true,
        position_id: true,
        is_active: true,
        created_at: true,
        updated_at: true,
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

    Logger.info('Employee updated', { employeeId: id });

    return res.json({
      success: true,
      data: employee
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Update employee failed', { employeeId: req.params.id, error: error.message });
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

      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          error: {
            type: 'BAD_REQUEST',
            message: 'Employee with this NIP or email already exists'
          }
        });
      }

      if (error.code === 'P2003') {
        return res.status(400).json({
          success: false,
          error: {
            type: 'BAD_REQUEST',
            message: 'Invalid division or position'
          }
        });
      }

      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Employee not found'
          }
        });
      }
    }

    Logger.error('Update employee error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

// DELETE /employees/:id (soft delete)
employeeRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant not specified', 400);
    }

    const { id } = req.params;

    const prisma = getPrisma();

    // Check if employee exists and belongs to tenant
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        employee_id: id,
        tenant_id: req.tenant.tenant_id
      }
    });

    if (!existingEmployee) {
      throw new AppError('Employee not found', 404);
    }

    // Soft delete - set is_active to false
    await prisma.employee.update({
      where: {
        employee_id: id
      },
      data: { is_active: false }
    });

    Logger.info('Employee deactivated', { employeeId: id });

    return res.json({
      success: true,
      message: 'Employee deactivated successfully'
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Delete employee failed', { employeeId: req.params.id, error: error.message });
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
            message: 'Employee not found'
          }
        });
      }
    }

    Logger.error('Delete employee error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

export default employeeRouter;
