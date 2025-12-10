import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, ILike, In } from 'typeorm';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { Page, RolePage, Role } from 'src/entities';

@Injectable()
export class PagesService {
  private logger = new Logger(PagesService.name);

  constructor(
    @InjectRepository(Page)
    private pageRepository: Repository<Page>,

    @InjectRepository(RolePage)
    private rolePageRepository: Repository<RolePage>,

    @InjectRepository(Role)
    private roleRepository: Repository<Role>,

    private dataSource: DataSource,
  ) {}

  /**
   * Crear una nueva página con roles asociados (transacción)
   */
  async create(createPageDto: CreatePageDto, userId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingPage = await queryRunner.manager.findOne(Page, {
        where: { url: createPageDto.url },
      });

      if (existingPage) {
        throw new ConflictException(
          `Ya existe una página con la URL: ${createPageDto.url}`,
        );
      }

      if (createPageDto.roleIds && createPageDto.roleIds.length > 0) {
        const roles = await queryRunner.manager.find(Role, {
          where: { id: In(createPageDto.roleIds), isActive: true },
        });

        if (roles.length !== createPageDto.roleIds.length) {
          throw new BadRequestException(
            'Algunos roles no existen o están inactivos',
          );
        }
      }

      const page = queryRunner.manager.create(Page, {
        name: createPageDto.name,
        description: createPageDto.description,
        url: createPageDto.url,
        icon: createPageDto.icon,
        order: createPageDto.order ?? 0,
        isActive: createPageDto.isActive ?? true,
        createdBy: userId,
      });

      const savedPage = await queryRunner.manager.save(page);

      if (createPageDto.roleIds && createPageDto.roleIds.length > 0) {
        const rolePages = createPageDto.roleIds.map((roleId) =>
          queryRunner.manager.create(RolePage, {
            roleId,
            pageId: savedPage.id,
            createdBy: userId,
          }),
        );

        await queryRunner.manager.save(rolePages);
      }

      await queryRunner.commitTransaction();

      this.logger.log(
        `Page created: "${savedPage.name}" (ID: ${savedPage.id}) by user ${userId}`,
      );

      return this.findOne(savedPage.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error creating page: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Obtener todas las páginas con paginación y filtros
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

    const [pages, total] = await this.pageRepository.findAndCount({
      where: whereCondition,
      relations: ['rolePages', 'rolePages.role', 'createdByUser'],
      order: {
        order: 'DESC',
        name: 'ASC',
      },
      skip,
      take: limit,
    });

    const formattedPages = pages.map((page) => ({
      ...page,
      roles: page.rolePages?.map((rp) => ({
        id: rp.role.id,
        name: rp.role.name,
        description: rp.role.description,
      })),
      rolePages: undefined,
    }));

    return {
      data: formattedPages,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtener una página por ID con sus roles
   */
  async findOne(id: number) {
    const page = await this.pageRepository.findOne({
      where: { id },
      relations: [
        'rolePages',
        'rolePages.role',
        'createdByUser',
        'updatedByUser',
      ],
    });

    if (!page) {
      throw new NotFoundException(`Página con ID ${id} no encontrada`);
    }

    return {
      ...page,
      roles: page.rolePages?.map((rp) => ({
        id: rp.role.id,
        name: rp.role.name,
        description: rp.role.description,
        isActive: rp.role.isActive,
      })),
      rolePages: undefined,
    };
  }

  /**
   * Obtener páginas por rol
   */
  async findPagesByRole(roleId: number, isActive: boolean = true) {
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Rol con ID ${roleId} no encontrado`);
    }

    const whereCondition: any = { isActive };

    const pages = await this.pageRepository
      .createQueryBuilder('page')
      .innerJoin('page.rolePages', 'rolePage')
      .where('rolePage.roleId = :roleId', { roleId })
      .andWhere('page.isActive = :isActive', { isActive })
      .orderBy('page.order', 'DESC')
      .addOrderBy('page.name', 'ASC')
      .getMany();

    return {
      roleId,
      roleName: role.name,
      pages: pages.map((page) => ({
        id: page.id,
        name: page.name,
        description: page.description,
        url: page.url,
        icon: page.icon,
        order: page.order,
      })),
    };
  }

  /**
   * Actualizar una página (transacción)
   */
  async update(id: number, updatePageDto: UpdatePageDto, userId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const page = await queryRunner.manager.findOne(Page, {
        where: { id },
      });

      if (!page) {
        throw new NotFoundException(`Página con ID ${id} no encontrada`);
      }

      if (updatePageDto.url && updatePageDto.url !== page.url) {
        const existingPage = await queryRunner.manager.findOne(Page, {
          where: { url: updatePageDto.url },
        });

        if (existingPage) {
          throw new ConflictException(
            `Ya existe una página con la URL: ${updatePageDto.url}`,
          );
        }
      }

      if (updatePageDto.roleIds && updatePageDto.roleIds.length > 0) {
        const roles = await queryRunner.manager.find(Role, {
          where: { id: In(updatePageDto.roleIds), isActive: true },
        });

        if (roles.length !== updatePageDto.roleIds.length) {
          throw new BadRequestException(
            'Algunos roles no existen o están inactivos',
          );
        }
      }

      // ? Omitir roleIds del DTO previo a actualizar
      const { roleIds, ...updateData } = updatePageDto;

      await queryRunner.manager.update(
        Page,
        { id },
        {
          ...updateData,
          updatedBy: userId,
        },
      );

      if (updatePageDto.roleIds) {
        await queryRunner.manager.delete(RolePage, { pageId: id });
        if (updatePageDto.roleIds.length > 0) {
          const rolePages = updatePageDto.roleIds.map((roleId) =>
            queryRunner.manager.create(RolePage, {
              roleId,
              pageId: id,
              createdBy: userId,
            }),
          );

          await queryRunner.manager.save(rolePages);
        }
      }

      await queryRunner.commitTransaction();

      this.logger.log(`Page updated: ID ${id} by user ${userId}`);

      return this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error updating page: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Eliminar una página (soft delete - cambiar isActive a false)
   */
  async remove(id: number, userId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const page = await queryRunner.manager.findOne(Page, {
        where: { id },
      });

      if (!page) {
        throw new NotFoundException(`Página con ID ${id} no encontrada`);
      }

      await queryRunner.manager.update(
        Page,
        { id },
        {
          isActive: false,
          updatedBy: userId,
        },
      );

      await queryRunner.commitTransaction();

      this.logger.log(`Page soft-deleted: ID ${id} by user ${userId}`);

      return {
        message: 'Página desactivada exitosamente',
        id,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error deleting page: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Reordenar páginas
   */
  async reorderPages(
    pageOrders: Array<{ id: number; order: number }>,
    userId: number,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const { id, order } of pageOrders) {
        const page = await queryRunner.manager.findOne(Page, {
          where: { id },
        });

        if (!page) {
          throw new NotFoundException(`Página con ID ${id} no encontrada`);
        }

        await queryRunner.manager.update(
          Page,
          { id },
          {
            order,
            updatedBy: userId,
          },
        );
      }

      await queryRunner.commitTransaction();

      this.logger.log(`Pages reordered by user ${userId}`);

      return {
        message: 'Páginas reordenadas exitosamente',
        updated: pageOrders.length,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error reordering pages: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Obtener estadísticas de páginas
   */
  async getStats() {
    const total = await this.pageRepository.count();
    const active = await this.pageRepository.count({
      where: { isActive: true },
    });
    const inactive = total - active;

    const pagesWithRoleCount = await this.pageRepository
      .createQueryBuilder('page')
      .leftJoin('page.rolePages', 'rolePage')
      .select('page.id', 'id')
      .addSelect('page.name', 'name')
      // .addSelect('COUNT(rolePage.roleId)', 'roleCount')
      .where('page.isActive = :isActive', { isActive: true })
      .groupBy('page.id')
      .addGroupBy('page.name')
      // .orderBy('roleCount', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      total,
      active,
      inactive,
      topPagesByRoles: pagesWithRoleCount.map((p) => ({
        id: parseInt(p.id),
        name: p.name,
        roleCount: parseInt(p.roleCount),
      })),
    };
  }
}
