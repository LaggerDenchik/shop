import { Body, Controller, Get, NotFoundException, Param, Put, UseGuards, Request, Post, Delete, Req, Patch } from '@nestjs/common';
import { CabinetsService } from './cabinets.service';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';

@Controller('cabinets')
export class CabinetsController {
  usersRepository: any;
  constructor(private cabinetsService: CabinetsService) { }

  // @Get()
  @Get()
  getAllUsers() {
    return this.cabinetsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('organization')
  async getMyOrganization(@Request() req) {
    const user = await this.cabinetsService.findUserById(req.user.id, ['organization']);

    if (!user?.organization) {
      throw new NotFoundException('Организация не найдена для данного пользователя');
    }

    const org = user.organization;

    return {
      ...org,
      avatar: user.avatar
        ? `${user.avatar}`
        : null
    };
  }
  
  @UseGuards(JwtAuthGuard)
  @Put('organization')
  async updateMyOrganization(@Request() req, @Body() body) {
    if (!req.user?.id) {
      throw new NotFoundException('Пользователь не найден');
    }

    const user = await this.cabinetsService.findUserById(req.user.id);
    if (!user?.organizationId) {
      throw new NotFoundException('Организация не найдена');
    }

    return this.cabinetsService.updateOrganization(user.organizationId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('employees')
  async getOrganizationEmployees(@Request() req) {
    return this.cabinetsService.getOrganizationEmployees(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('employees')
  async createEmployee(@Request() req, @Body() body) {
    return this.cabinetsService.createEmployee(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Put('employees/:id')
  async updateEmployee(@Request() req, @Param('id') id: string, @Body() body) {
    return this.cabinetsService.updateEmployee(req.user.id, id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('employees/:id')
  async deleteEmployee(
    @Req() req,
    @Param('id') employeeId: string
  ) {
    return this.cabinetsService.deleteEmployee(req.user.id, employeeId);
  }

  @Patch('employees/:id/reset-password')
  @UseGuards(JwtAuthGuard)
  async resetEmployeePassword(@Request() req, @Param('id') id: string) {
    console.log('resetEmployeePassword by user:', req.user);
    return this.cabinetsService.resetEmployeePassword(req.user.sub, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('employees/:id/permissions')
  async updateEmployeePermissions(
    @Request() req,
    @Param('id') id: string,
    @Body('permissions') permissions: string[],
  ) {
    return this.cabinetsService.updateEmployeePermissions(req.user.id, id, permissions);
  }

  @Get(':id')
  getUserById(@Param('id') id: string) {
    return this.cabinetsService.findUserById(id);
  }

}
