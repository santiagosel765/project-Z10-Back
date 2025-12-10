import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, ILike, In } from 'typeorm';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role, RolePage, Page, User } from 'src/entities';

@Injectable()
export class RolesService {
  private logger = new Logger(RolesService.name);

  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,

    @InjectRepository(RolePage)
    private rolePageRepository: Repository<RolePage>,

    @InjectRepository(Page)
    private pageRepository: Repository<Page>,

    private dataSource: DataSource,
  ) {}

  /**
   * Crear un nuevo rol con páginas asociadas (transacción)
   */
  async create(createRoleDto: CreateRoleDto, userId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingRole = await queryRunner.manager.findOne(Role, {
        where: { name: createRoleDto.name },
      });

      if (existingRole) {
        throw new ConflictException(
          `Ya existe un rol con el nombre: ${createRoleDto.name}`,
        );
      }

      if (createRoleDto.pageIds && createRoleDto.pageIds.length > 0) {
        const pages = await queryRunner.manager.find(Page, {
          where: { id: In(createRoleDto.pageIds), isActive: true },
        });

        if (pages.length !== createRoleDto.pageIds.length) {
          throw new BadRequestException(
            'Algunas páginas no existen o están inactivas',
          );
        }
      }

      const role = queryRunner.manager.create(Role, {
        name: createRoleDto.name,
        description: createRoleDto.description,
        isActive: createRoleDto.isActive ?? true,
        createdBy: userId,
      });

      const savedRole = await queryRunner.manager.save(role);

      if (createRoleDto.pageIds && createRoleDto.pageIds.length > 0) {
        const rolePages = createRoleDto.pageIds.map((pageId) =>
          queryRunner.manager.create(RolePage, {
            roleId: savedRole.id,
            pageId,
            createdBy: userId,
          }),
        );

        await queryRunner.manager.save(rolePages);
      }

      await queryRunner.commitTransaction();

      this.logger.log(
        `Role created: "${savedRole.name}" (ID: ${savedRole.id}) by user ${userId}`,
      );

      return this.findOne(savedRole.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error creating role: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Obtener todos los roles con paginación y filtros
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
    isActive?: boolean,
    search?: string,
  ) {
    const skip = (page - 1) * limit;

    const whereCondition: any = {};

    if (isActive !== undefined) {
      whereCondition.isActive = isActive;
    }

    if (search) {
      whereCondition.name = ILike(`%${search}%`);
    }

    const [roles, total] = await this.roleRepository.findAndCount({
      where: whereCondition,
      relations: ['rolePages', 'rolePages.page', 'createdByUser'],
      order: {
        name: 'ASC',
      },
      skip,
      take: limit,
    });

    const formattedRoles = roles.map((role) => ({
      ...role,
      pages: role.rolePages?.map((rp) => ({
        id: rp.page.id,
        name: rp.page.name,
        url: rp.page.url,
        icon: rp.page.icon,
      })),
      rolePages: undefined,
    }));

    return {
      data: formattedRoles,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtener un rol por ID con sus páginas
   */
  async findOne(id: number) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: [
        'rolePages',
        'rolePages.page',
        'createdByUser',
        'updatedByUser',
      ],
    });

    if (!role) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    return {
      ...role,
      pages: role.rolePages?.map((rp) => ({
        id: rp.page.id,
        name: rp.page.name,
        description: rp.page.description,
        url: rp.page.url,
        icon: rp.page.icon,
        order: rp.page.order,
        isActive: rp.page.isActive,
      })),
      rolePages: undefined,
    };
  }

  /**
   * Obtener roles por usuario
   */
  async findRolesByUser(userId: number) {
    const user = await this.dataSource.manager.findOne(User, {
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    const roles = await this.roleRepository
      .createQueryBuilder('role')
      .innerJoin('role.userRoles', 'userRole')
      .where('userRole.userId = :userId', { userId })
      .andWhere('role.isActive = :isActive', { isActive: true })
      .orderBy('role.name', 'ASC')
      .getMany();

    return {
      userId,
      userName: `${user.firstName} ${user.lastName}`,
      roles: roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
      })),
    };
  }

  /**
   * Actualizar un rol (transacción)
   */
  async update(id: number, updateRoleDto: UpdateRoleDto, userId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const role = await queryRunner.manager.findOne(Role, {
        where: { id },
      });

      if (!role) {
        throw new NotFoundException(`Rol con ID ${id} no encontrado`);
      }

      if (updateRoleDto.name && updateRoleDto.name !== role.name) {
        const existingRole = await queryRunner.manager.findOne(Role, {
          where: { name: updateRoleDto.name },
        });

        if (existingRole) {
          throw new ConflictException(
            `Ya existe un rol con el nombre: ${updateRoleDto.name}`,
          );
        }
      }

      if (updateRoleDto.pageIds && updateRoleDto.pageIds.length > 0) {
        const pages = await queryRunner.manager.find(Page, {
          where: { id: In(updateRoleDto.pageIds), isActive: true },
        });

        if (pages.length !== updateRoleDto.pageIds.length) {
          throw new BadRequestException(
            'Algunas páginas no existen o están inactivas',
          );
        }
      }

      const { pageIds, ...updateData} = updateRoleDto;

      await queryRunner.manager.update(
        Role,
        { id },
        {
          ...updateData,
          updatedBy: userId,
        },
      );

      // ? Acutalizar RolePage, en caso vengan
      if (updateRoleDto.pageIds !== undefined) {
        await queryRunner.manager.delete(RolePage, { roleId: id });
        if (updateRoleDto.pageIds.length > 0) {
          const rolePages = updateRoleDto.pageIds.map((pageId) =>
            queryRunner.manager.create(RolePage, {
              roleId: id,
              pageId,
              createdBy: userId,
            }),
          );

          await queryRunner.manager.save(rolePages);
        }
      }

      await queryRunner.commitTransaction();

      this.logger.log(`Role updated: ID ${id} by user ${userId}`);

      return this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error updating role: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Eliminar un rol (soft delete)
   */
  async remove(id: number, userId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const role = await queryRunner.manager.findOne(Role, {
        where: { id },
      });

      if (!role) {
        throw new NotFoundException(`Rol con ID ${id} no encontrado`);
      }

      await queryRunner.manager.update(
        Role,
        { id },
        {
          isActive: false,
          updatedBy: userId,
        },
      );

      await queryRunner.commitTransaction();

      this.logger.log(`Role soft-deleted: ID ${id} by user ${userId}`);

      return {
        message: 'Rol desactivado exitosamente',
        id,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error deleting role: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Asignar páginas a un rol
   */
  async assignPages(
    roleId: number,
    pageIds: number[],
    userId: number,
    replace: boolean = true,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const role = await queryRunner.manager.findOne(Role, {
        where: { id: roleId, isActive: true },
      });

      if (!role) {
        throw new NotFoundException(
          `Rol con ID ${roleId} no encontrado o inactivo`,
        );
      }

      const pages = await queryRunner.manager.find(Page, {
        where: { id: In(pageIds), isActive: true },
      });

      if (pages.length !== pageIds.length) {
        throw new BadRequestException(
          'Algunas páginas no existen o están inactivas',
        );
      }

      // ? Si replace, elimina todos los RolePage del roleId
      if (replace) {
        await queryRunner.manager.delete(RolePage, { roleId });
      }

      const rolePages = pageIds.map((pageId) =>
        queryRunner.manager.create(RolePage, {
          roleId,
          pageId,
          createdBy: userId,
        }),
      );

      await queryRunner.manager.save(rolePages);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Pages ${replace ? 'replaced' : 'added'} for role ${roleId} by user ${userId}`,
      );

      return this.findOne(roleId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error assigning pages to role: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Obtener estadísticas de roles
   */
  async getStats() {
    const total = await this.roleRepository.count();
    const active = await this.roleRepository.count({
      where: { isActive: true },
    });
    const inactive = total - active;

    const rolesWithUserCount = await this.roleRepository
      .createQueryBuilder('role')
      .leftJoin('role.userRoles', 'userRole')
      .select('role.id', 'id')
      .addSelect('role.name', 'name')
      // .addSelect('COUNT(userRole.userId)', 'userCount')
      .where('role.isActive = :isActive', { isActive: true })
      .groupBy('role.id')
      .addGroupBy('role.name')
      // .orderBy('userCount', 'DESC')
      .limit(10)
      .getRawMany();

    const rolesWithPageCount = await this.roleRepository
      .createQueryBuilder('role')
      .leftJoin('role.rolePages', 'rolePage')
      .select('role.id', 'id')
      .addSelect('role.name', 'name')
      // .addSelect('COUNT(rolePage.pageId)', 'pageCount')
      .where('role.isActive = :isActive', { isActive: true })
      .groupBy('role.id')
      .addGroupBy('role.name')
      // .orderBy('pageCount', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      total,
      active,
      inactive,
      topRolesByUsers: rolesWithUserCount.map((r) => ({
        id: parseInt(r.id),
        name: r.name,
        userCount: parseInt(r.userCount),
      })),
      topRolesByPages: rolesWithPageCount.map((r) => ({
        id: parseInt(r.id),
        name: r.name,
        pageCount: parseInt(r.pageCount),
      })),
    };
  }
}
