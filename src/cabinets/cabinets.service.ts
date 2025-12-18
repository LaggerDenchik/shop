import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Repository, ILike } from 'typeorm';
import { Organization } from '../auth/entities/organization.entity';
import { User } from '../auth/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from '@auth/entities/role.entity';
import * as bcrypt from 'bcrypt';
import { Permission } from '@auth/entities/permission.entity';

@Injectable()
export class CabinetsService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,

    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,

    @InjectRepository(Organization)
    private readonly orgRepository: Repository<Organization>,

    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
  ) {}

  async findUserById(id: string, relations: string[] = []) {
    return this.usersRepository.findOne({
      where: { id },
      relations
    });
  }

  async findAll() {
    return this.usersRepository.find({
      select: ['id', 'email', 'fullName', 'phone', 'createdAt'],
    });
  }

  async updateOrganization(orgId: string, data: any) {
    const organization = await this.orgRepository.findOne({ where: { id: orgId } });
    
    if (!organization) {
      throw new NotFoundException('Организация не найдена');
    }
    
    Object.assign(organization, {
      name: data.name ?? organization.name,
      representative: data.representative ?? organization.representative,
      email: data.email ?? organization.email,
      phone: data.phone ?? organization.phone,
      unp: data.unp ?? organization.unp,
      address: data.address ?? organization.address,
      description: data.description ?? organization.description,
    });
    
    await this.orgRepository.save(organization);
    return organization;
  }

  // Получение списка сотрудников
  async getOrganizationEmployees(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['organization'],
    });
  
    if (!user?.organizationId) {
      throw new ForbiddenException('Вы не являетесь организацией');
    }
  
    return this.usersRepository.find({
      where: {
        organizationId: user.organizationId,
        roleId: '7fc971b0-50b4-4b00-be6b-bba457656160',
      },
      relations: ['permissions'],
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        createdAt: true,
        permissions: {
          id: true,
          tag: true,
          name: true,
          groups: true,
        },
      },
    });
  }

  // Создание сотрудника
  async createEmployee(userId: string, dto: any) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['organization'],
    });

    if (!user?.organizationId) {
      throw new ForbiddenException('Вы не являетесь организацией');
    }

    const existing = await this.usersRepository.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const role = await this.rolesRepository.findOne({
      where: { name: 'org_user' },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException('Роль org_user не найдена');
    }

    const plainPassword = dto.password || Math.random().toString(36).slice(-8);

    const newEmployee = this.usersRepository.create({
      email: dto.email,
      fullName: dto.fullName,
      phone: dto.phone,
      password: plainPassword,
      organizationId: user.organizationId,
      roleId: role.id,
      type: 'customer',
      isEmailVerified: true,
      permissions: role.permissions, 
    });

    const saved = await this.usersRepository.save(newEmployee);

    return {
      id: saved.id,
      email: saved.email,
      password: plainPassword,
    };
  }

  // Обновление данных сотрудника
  async updateEmployee(userId: string, employeeId: string, dto: any) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user?.organizationId) {
      throw new ForbiddenException('Вы не являетесь организацией');
    }

    const employee = await this.usersRepository.findOne({
      where: { id: employeeId },
    });

    if (!employee || employee.organizationId !== user.organizationId) {
      throw new ForbiddenException('Нет доступа');
    }

    Object.assign(employee, dto);
    return this.usersRepository.save(employee);
  }

  async deleteEmployee(userId: string, employeeId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user?.organizationId) {
      throw new ForbiddenException('Вы не являетесь организацией');
    }

    const employee = await this.usersRepository.findOne({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Сотрудник не найден');
    }

    if (employee.organizationId !== user.organizationId) {
      throw new ForbiddenException('Нет доступа к удалению этого сотрудника');
    }

    await this.usersRepository.remove(employee);

    return { message: 'Сотрудник успешно удалён' };
  }

  async resetEmployeePassword(orgUserId: string, employeeId: string) {
    const orgUser = await this.usersRepository.findOne({
      where: { id: orgUserId },
      relations: ['role'],
    });

    if (!orgUser?.organizationId) {
      throw new ForbiddenException('Вы не привязаны к организации');
    }

    const isOrganizationRole =
      orgUser.role?.name === 'org_admin' || orgUser.role?.name === 'org_user';

    if (!isOrganizationRole) {
      throw new ForbiddenException('Вы не являетесь организацией');
    }

    const employee = await this.usersRepository.findOne({
      where: { id: employeeId, organizationId: orgUser.organizationId },
    });

    if (!employee) {
      throw new NotFoundException('Сотрудник не найден или не принадлежит вашей организации');
    }

    const newPlainPassword = Math.random().toString(36).slice(-8);
    employee.password = await bcrypt.hash(newPlainPassword, 10);
    await this.usersRepository.save(employee);

    return {
      message: 'Пароль успешно сброшен',
      email: employee.email,
      newPassword: newPlainPassword,
    };
  }

  async updateEmployeePermissions(orgUserId: string, employeeId: string, permissionIds: string[]) {
    const orgUser = await this.usersRepository.findOne({ where: { id: orgUserId } });

    if (!orgUser?.organizationId || orgUser.type !== 'organization') {
      throw new ForbiddenException('Вы не являетесь организацией');
    }

    const employee = await this.usersRepository.findOne({
      where: { id: employeeId, organizationId: orgUser.organizationId },
      relations: ['permissions'],
    });

    if (!employee) {
      throw new NotFoundException('Сотрудник не найден или не принадлежит вашей организации');
    }

    const newPermissions = await this.permissionsRepository.findByIds(permissionIds);

    employee.permissions = newPermissions;
    await this.usersRepository.save(employee);

    return {
      message: 'Права сотрудника успешно обновлены',
      employeeId: employee.id,
      permissions: newPermissions.map(p => ({
        id: p.id,
        tag: p.tag,
        name: p.name,
        group: p.groups,
      })),
    };
  }

  async getAllPhysicalPersons() {
    const users = await this.usersRepository.find({
      where: { type: 'customer' },
      select: [
        'id',
        'email',
        'fullName',
        'phone'
      ],
      order: {
        fullName: 'ASC',
        email: 'ASC'
      }
    });

    return users;
  }

  async getAllOrganizations() {
    const users = await this.usersRepository.find({
      where: {
        type: 'organization',
        roleId: 'b305b4e2-f078-4a27-90fd-cb3322cf7d1e',
      },
      relations: ['organization'],
      select: {
        id: true,
        email: true,
        organization: {
          id: true,
          name: true,
          shortname: true,
        },
      },
      order: {
        organization: {
          name: 'ASC',
        },
      },
    });

    return users
      .filter(
        (u): u is User & { organization: Organization } =>
          !!u.organization
      )
      .map(u => ({
        userId: u.id,
        email: u.email,
        organizationId: u.organization.id,
        organizationName: u.organization.name,
        organizationShortName: u.organization.shortname,
      }));
  }
}