import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Role, User, UserRole } from 'src/entities';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { BcryptAdapter } from 'src/common/adapters/bcrypt.adapter';
import { formatDate } from 'src/common/utils/date-formatter.utils';

@Injectable()
export class UsersService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    // ? Initialize queryRunner
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const creationUser = await queryRunner.manager.findOne(User, {
        where: { id: createUserDto.createdBy },
      });

      if (!creationUser) {
        throw new NotFoundException(
          `Usuario de creación con ID ${createUserDto.createdBy} no existe`,
        );
      }

      const dbUser = await queryRunner.manager.findOne(User, {
        where: { email: createUserDto.email },
      });

      if (dbUser) {
        throw new ConflictException(
          `Usuario con el correo ${createUserDto.email} ya existe`,
        );
      }

      const user = queryRunner.manager.create(User, {
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        email: createUserDto.email,
        password: BcryptAdapter.hashPassword(createUserDto.password),
        createdBy: createUserDto.createdBy,
        employeeCode: createUserDto.employeeCode,
        birthdate: createUserDto.birthdate,
      });

      const savedUser = await queryRunner.manager.save(user);

      const dbRole = await queryRunner.manager.findOne(Role, {
        where: {
          id: createUserDto.roleId,
        },
      });

      if (!dbRole) {
        throw new NotFoundException(
          `Rol con ID ${createUserDto.roleId} no existe`,
        );
      }

      const userRole = queryRunner.manager.create(UserRole, {
        userId: savedUser.id,
        roleId: createUserDto.roleId,
        createdBy: createUserDto.createdBy,
      });

      await queryRunner.manager.save(userRole);

      await queryRunner.commitTransaction();

      const { password, ...createdUser } = savedUser;

      return createdUser;
    } catch (error) {
      throw error;
    }
  }

  async findUserByEmail(email: string) {
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const dbUser = await queryRunner.manager.findOne(User, {
        where: { email: email },
      });

      if (!dbUser) {
        throw new NotFoundException(`Usuario con correo ${email} no existe`);
      }

      const userRoles = await queryRunner.manager.find(UserRole, {
        where: {
          userId: dbUser.id,
        },
        relations: {
          user: true,
          role: true,
          createdByUser: true,
        },
      });

      await queryRunner.commitTransaction();

      return {
        user: dbUser,
        roles:
          userRoles.map((ur) => ({ id: ur.roleId, name: ur.role.name })) || [],
      };
    } catch (error) {
      throw error;
    }
  }

  async findAll() {
    const dbUsers = await this.userRepository.find({
      relations: {
        createdByUser: true,
        updatedByUser: true,
        userRoles: {
          role: true,
        },
      },
      select: {
        createdByUser: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          employeeCode: true,
        },
        updatedByUser: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          employeeCode: true,
        },
        userRoles: {
          createdAt: true,
          role: {
            id: true,
            name: true,
          },
        },
      },
    });

    const users = dbUsers.map((u) => {
      const { password, ...res } = u;
      return {
        ...res,
        createdAt: formatDate(res.createdAt),
        updatedAt: formatDate(res.updatedAt),
        // birthdate: formatDate(res.birthdate),
      };
    });

    return users;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const updateUser = await queryRunner.manager.findOne(User, {
        where: { id: updateUserDto.updatedBy },
      });

      if (!updateUser) {
        throw new NotFoundException(
          `Usuario de actualización con ID ${updateUserDto.updatedBy} no existe`,
        );
      }

      const dbUser = await queryRunner.manager.findOne(User, {
        where: { id },
      });

      if (!dbUser) {
        throw new NotFoundException(`Usuario con el ID ${id} no existe`);
      }

      const {roleId, ...updateData } = updateUserDto

      const user = await queryRunner.manager.update(User, id, {
        ...updateData,
      });
      console.log(user)

      if (roleId) {
        await this.updateUserRole(id, updateUserDto, queryRunner);
      }

      await queryRunner.commitTransaction();

      return true;
    } catch (error) {
      throw error;
    }
  }

  async updateUserRole(
    id: number,
    updateUserDto: UpdateUserDto,
    queryRunner: QueryRunner,
  ) {
    const dbRole = await queryRunner.manager.findOne(Role, {
      where: {
        id: updateUserDto.roleId,
      },
    });

    if (!dbRole) {
      throw new NotFoundException(
        `Rol con ID ${updateUserDto.roleId} no existe`,
      );
    }

    const currentRole = await queryRunner.manager.findOne(UserRole, {
      where: {
        userId: id,
      },
    });

    console.log({currentRole})

    if (currentRole) {
      const result = await queryRunner.query(
        `DELETE FROM user_role WHERE user_id = $1`,
        [id],
      );
    } 
    const userRole = queryRunner.manager.create(UserRole, {
      userId: id,
      roleId: updateUserDto.roleId,
      createdBy: updateUserDto.updatedBy,
    });
    await queryRunner.manager.save(userRole);
  }

  async findUserById(id: number) {
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const dbUser = await queryRunner.manager.findOne(User, {
        where: { id },
      });

      if (!dbUser) {
        throw new NotFoundException(`Usuario con ID ${id} no existe`);
      }

      const userRoles = await queryRunner.manager.find(UserRole, {
        where: {
          userId: dbUser.id,
        },
        relations: {
          user: true,
          role: true,
          createdByUser: true,
        },
      });

      await queryRunner.commitTransaction();

      return {
        user: dbUser,
        roles:
          userRoles.map((ur) => ({ id: ur.roleId, name: ur.role.name })) || [],
      };
    } catch (error) {
      throw error;
    }
  }

  async disableUser(id: number, updateUserDto: UpdateUserDto) {
    await this.findUserById( updateUserDto.updatedBy );
    await this.findUserById( id );
    
    try {
      await this.userRepository.update(id, {
        isActive: false,
      });

      return { ok: true, }
      
    } catch (error) {
      throw error;
    }
  }
  async enableUser(id: number, updateUserDto: UpdateUserDto) {
    await this.findUserById( updateUserDto.updatedBy );
    await this.findUserById( id );
    
    try {
      await this.userRepository.update(id, {
        isActive: true,
      });

      return { ok: true, }
      
    } catch (error) {
      throw error;
    }
  }
}
