import { Router, Request, Response } from 'express';
import { getPrisma } from '../../shared/utils/database';
import { Logger } from '../../shared/middleware/logger';
import { AppError } from '../../shared/middleware/errorHandler';
import { Prisma } from '@prisma/client';

export const roleRouter: Router = Router();

interface CreateRoleRequest {
  name: string;
  description?: string;
  is_system?: boolean;
}

interface UpdateRoleRequest {
  name?: string;
  description?: string;
}

interface UpdatePermissionsRequest {
  permissions: string[];
}

interface ListRolesQuery {
  search?: string;
  is_system?: string;
  page?: string;
  limit?: string;
}

// POST /roles/create
roleRouter.post('/create', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant not specified', 400);
    }

    const { name, description, is_system }: CreateRoleRequest = req.body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      throw new AppError('Role name is required', 400);
    }

    const trimmedName = name.trim();

    if (trimmedName.length > 100) {
      throw new AppError('Role name must be less than 100 characters', 400);
    }

    const prisma = getPrisma();

    // Check if role name already exists in this tenant (case-insensitive)
    const existingRole = await prisma.role.findFirst({
      where: {
        tenant_id: req.tenant.tenant_id,
        name: {
          mode: 'insensitive',
          equals: trimmedName
        }
      }
    });

    if (existingRole) {
      throw new AppError('Role with this name already exists in this tenant', 409);
    }

    // Create role
    const role = await prisma.role.create({
      data: {
        tenant_id: req.tenant.tenant_id,
        name: trimmedName,
        description: description?.trim() || null,
        is_system: is_system || false
      },
      select: {
        role_id: true,
        tenant_id: true,
        name: true,
        description: true,
        is_system: true,
        created_at: true,
        role_permissions: {
          select: {
            permission_id: true,
            assigned_at: true,
            permission: {
              select: {
                permission_id: true,
                code: true,
                description: true
              }
            }
          }
        }
      }
    });

    Logger.info('Role created', {
      roleId: role.role_id,
      name: trimmedName,
      is_system: role.is_system
    });

    return res.status(201).json({
      success: true,
      data: role
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Create role failed', { error: error.message });
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
            message: 'Role with this name already exists'
          }
        });
      }
    }

    Logger.error('Create role error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

// GET /roles
roleRouter.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant not specified', 400);
    }

    const query: ListRolesQuery = req.query;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      tenant_id: req.tenant.tenant_id
    };

    // Filter by is_system
    if (query.is_system !== undefined) {
      where.is_system = query.is_system === 'true';
    }

    // Search by name
    if (query.search) {
      where.name = {
        contains: query.search,
        mode: 'insensitive'
      };
    }

    const prisma = getPrisma();

    const [roles, total] = await Promise.all([
      prisma.role.findMany({
        where,
        select: {
          role_id: true,
          tenant_id: true,
          name: true,
          description: true,
          is_system: true,
          created_at: true,
          
          role_permissions: {
            select: {
              permission_id: true,
              permission: {
                select: {
                  permission_id: true,
                  code: true,
                  description: true
                }
              }
            }
          },
          user_roles: {
            select: {
              user_id: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' }
      }),
      prisma.role.count({ where })
    ]);

    // Transform roles to include permission count and user count
    const transformedRoles = roles.map(role => ({
      ...role,
      permission_count: role.role_permissions.length,
      permission_codes: role.role_permissions.map(rp => rp.permission.code),
      user_count: role.user_roles.length
    }));

    Logger.info('Get roles list', {
      count: transformedRoles.length,
      total,
      page,
      limit
    });

    return res.json({
      success: true,
      data: transformedRoles,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Get roles failed', { error: error.message });
      return res.status(error.statusCode).json({
        success: false,
        error: {
          type: error.type,
          message: error.message
        }
      });
    }

    Logger.error('Get roles error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

// GET /roles/:id
roleRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant not specified', 400);
    }

    const { id } = req.params;

    if (!id || id.length < 1) {
      throw new AppError('Invalid role ID', 400);
    }

    const prisma = getPrisma();
    const role = await prisma.role.findFirst({
      where: {
        role_id: id,
        tenant_id: req.tenant.tenant_id
      },
      select: {
        role_id: true,
        tenant_id: true,
        name: true,
        description: true,
        is_system: true,
        created_at: true,
        
        role_permissions: {
          select: {
            permission_id: true,
            assigned_at: true,
            permission: {
              select: {
                permission_id: true,
                code: true,
                description: true
              }
            }
          }
        },
        user_roles: {
          select: {
            user_id: true,
            user: {
              select: {
                email: true
              }
            }
          }
        }
      }
    });

    if (!role) {
      throw new AppError('Role not found', 404);
    }

    Logger.info('Get role details', { roleId: id });

    return res.json({
      success: true,
      data: {
        ...role,
        permission_count: role.role_permissions.length,
        permission_codes: role.role_permissions.map(rp => rp.permission.code),
        user_count: role.user_roles.length
      }
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Get role failed', { roleId: req.params.id, error: error.message });
      return res.status(error.statusCode).json({
        success: false,
        error: {
          type: error.type,
          message: error.message
        }
      });
    }

    Logger.error('Get role error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

// PATCH /roles/:id
roleRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant not specified', 400);
    }

    const { id } = req.params;
    const updates: UpdateRoleRequest = req.body;

    if (Object.keys(updates).length === 0) {
      throw new AppError('No fields to update', 400);
    }

    // Validate name if provided
    if (updates.name !== undefined) {
      if (!updates.name || updates.name.trim().length === 0) {
        throw new AppError('Role name cannot be empty', 400);
      }

      if (updates.name.trim().length > 100) {
        throw new AppError('Role name must be less than 100 characters', 400);
      }

      updates.name = updates.name.trim();
    }

    if (updates.description !== undefined) {
      updates.description = updates.description?.trim() || null;
    }

    const prisma = getPrisma();

    // Check if role exists and belongs to tenant
    const existingRole = await prisma.role.findFirst({
      where: {
        role_id: id,
        tenant_id: req.tenant.tenant_id
      }
    });

    if (!existingRole) {
      throw new AppError('Role not found', 404);
    }

    // Prevent updating system roles
    if (existingRole.is_system) {
      throw new AppError('Cannot modify system roles', 400);
    }

    // Check if new name already exists (if name is being updated)
    if (updates.name && updates.name !== existingRole.name) {
      const duplicateName = await prisma.role.findFirst({
        where: {
          tenant_id: req.tenant.tenant_id,
          name: {
            mode: 'insensitive',
            equals: updates.name
          },
          role_id: { not: id } // Exclude current role
        }
      });

      if (duplicateName) {
        throw new AppError('Role with this name already exists', 409);
      }
    }

    // Update role
    const role = await prisma.role.update({
      where: {
        role_id: id
      },
      data: updates,
      select: {
        role_id: true,
        tenant_id: true,
        name: true,
        description: true,
        is_system: true,
        created_at: true
      }
    });

    Logger.info('Role updated', { roleId: id });

    return res.json({
      success: true,
      data: role
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Update role failed', { roleId: req.params.id, error: error.message });
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
            message: 'Role with this name already exists'
          }
        });
      }

      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Role not found'
          }
        });
      }
    }

    Logger.error('Update role error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

// DELETE /roles/:id
roleRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant not specified', 400);
    }

    const { id } = req.params;

    if (!id || id.length < 1) {
      throw new AppError('Invalid role ID', 400);
    }

    const prisma = getPrisma();

    // Check if role exists and belongs to tenant
    const role = await prisma.role.findFirst({
      where: {
        role_id: id,
        tenant_id: req.tenant.tenant_id
      },
      include: {
        user_roles: {
          select: {
            user_id: true
          }
        }
      }
    });

    if (!role) {
      throw new AppError('Role not found', 404);
    }

    // Prevent deleting system roles
    if (role.is_system) {
      throw new AppError('Cannot delete system roles', 400);
    }

    // Check if role is assigned to any users
    if (role.user_roles.length > 0) {
      throw new AppError('Cannot delete role that is assigned to users', 400);
    }

    // Delete role (this will cascade delete role_permissions)
    await prisma.role.delete({
      where: {
        role_id: id
      }
    });

    Logger.info('Role deleted', { roleId: id });

    return res.json({
      success: true,
      message: 'Role deleted successfully'
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Delete role failed', { roleId: req.params.id, error: error.message });
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
            message: 'Role not found'
          }
        });
      }

      if (error.code === 'P2003') {
        return res.status(400).json({
          success: false,
          error: {
            type: 'BAD_REQUEST',
            message: 'Cannot delete role due to existing references'
          }
        });
      }
    }

    Logger.error('Delete role error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

// PUT /roles/:id/permissions
roleRouter.put('/:id/permissions', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant not specified', 400);
    }

    const { id } = req.params;
    const { permissions }: UpdatePermissionsRequest = req.body;

    if (!permissions || !Array.isArray(permissions)) {
      throw new AppError('Permissions array is required', 400);
    }

    const prisma = getPrisma();

    // Verify role belongs to tenant
    const role = await prisma.role.findFirst({
      where: {
        role_id: id,
        tenant_id: req.tenant.tenant_id
      }
    });

    if (!role) {
      throw new AppError('Role not found', 404);
    }

    // Prevent modifying system roles
    if (role.is_system) {
      throw new AppError('Cannot modify system roles', 400);
    }

    // Validate all permissions exist
    const permissionObjects = await prisma.permission.findMany({
      where: {
        code: { in: permissions }
      }
    });

    if (permissionObjects.length !== permissions.length) {
      const foundCodes = permissionObjects.map(p => p.code);
      const missingCodes = permissions.filter(code => !foundCodes.includes(code));
      throw new AppError(`Invalid permissions: ${missingCodes.join(', ')}`, 400);
    }

    // Use transaction to replace permissions
    await prisma.$transaction(async (tx) => {
      // Remove existing permissions
      await tx.rolePermission.deleteMany({
        where: { role_id: id }
      });

      // Add new permissions
      if (permissions.length > 0) {
        const rolePermissionData = permissionObjects.map(permission => ({
          role_id: id,
          permission_id: permission.permission_id
        }));

        await tx.rolePermission.createMany({
          data: rolePermissionData
        });
      }
    });

    Logger.info('Role permissions updated', {
      roleId: id,
      permissionCount: permissions.length
    });

    return res.json({
      success: true,
      message: 'Permissions updated successfully',
      data: {
        role_id: id,
        permission_count: permissions.length,
        permissions
      }
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Update permissions failed', { roleId: req.params.id, error: error.message });
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
            message: 'Role not found'
          }
        });
      }
    }

    Logger.error('Update permissions error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

// GET /roles/:id/permissions
roleRouter.get('/:id/permissions', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant not specified', 400);
    }

    const { id } = req.params;

    const prisma = getPrisma();
    const role = await prisma.role.findFirst({
      where: {
        role_id: id,
        tenant_id: req.tenant.tenant_id
      },
      select: {
        role_id: true,
        name: true,
        role_permissions: {
          select: {
            permission_id: true,
            assigned_at: true,
            permission: {
              select: {
                permission_id: true,
                code: true,
                description: true
              }
            }
          }
        }
      }
    });

    if (!role) {
      throw new AppError('Role not found', 404);
    }

    // Get all available permissions for comparison
    const allPermissions = await prisma.permission.findMany({
      orderBy: { code: 'asc' }
    });

    // Group permissions by module (based on code prefix)
    const permissionsByModule: { [key: string]: typeof allPermissions } = {};
    allPermissions.forEach(permission => {
      const module = permission.code.split(':')[0] || 'other';
      if (!permissionsByModule[module]) {
        permissionsByModule[module] = [];
      }
      permissionsByModule[module].push(permission);
    });

    const assignedCodes = role.role_permissions.map(rp => rp.permission.code);

    Logger.info('Get role permissions', { roleId: id });

    return res.json({
      success: true,
      data: {
        role_id: role.role_id,
        role_name: role.name,
        assigned_permissions: role.role_permissions.map(rp => ({
          permission_id: rp.permission.permission_id,
          code: rp.permission.code,
          description: rp.permission.description,
          assigned_at: rp.assigned_at
        })),
        assigned_codes: assignedCodes,
        all_permissions_by_module: permissionsByModule
      }
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Get role permissions failed', { roleId: req.params.id, error: error.message });
      return res.status(error.statusCode).json({
        success: false,
        error: {
          type: error.type,
          message: error.message
        }
      });
    }

    Logger.error('Get role permissions error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

export default roleRouter;
