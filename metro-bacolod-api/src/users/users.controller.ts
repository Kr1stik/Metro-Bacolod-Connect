import { Controller, Post, Get, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, ChangeRoleDto, DeactivateUserDto, RejectVerificationDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // POST /users/create - Create own profile
  @Post('create')
  @UseGuards(FirebaseAuthGuard)
  create(@Body() body: CreateUserDto, @Req() req: any) {
    const authenticatedUid = req.user.uid;
    if (body.uid && body.uid !== authenticatedUid) {
      throw new Error('Cannot create profile for another user.');
    }
    return this.usersService.createUser({ ...body, uid: authenticatedUid });
  }

  // GET /users/me - Get own profile
  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  getMe(@Req() req: any) {
    return this.usersService.getMe(req.user.uid);
  }

  // PUT /users/me - Update own profile
  @Put('me')
  @UseGuards(FirebaseAuthGuard)
  updateMe(@Body() body: UpdateUserDto, @Req() req: any) {
    return this.usersService.updateProfile(req.user.uid, body);
  }

  // GET /users/search?q=name - Search users
  @Get('search')
  @UseGuards(FirebaseAuthGuard)
  search(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.usersService.searchUsers(q || '', limit ? parseInt(limit) : 20);
  }

  // GET /users/professionals - List sellers/agents
  @Get('professionals')
  @UseGuards(FirebaseAuthGuard)
  getProfessionals(@Query('limit') limit?: string) {
    return this.usersService.getProfessionals(limit ? parseInt(limit) : 50);
  }

  // GET /users/all - Admin: list all users
  @Get('all')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  findAll(@Query('limit') limit?: string) {
    return this.usersService.findAll(limit ? parseInt(limit) : 100);
  }

  // GET /users/:id - Get user by ID
  @Get(':id')
  @UseGuards(FirebaseAuthGuard)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  // PUT /users/:id/role - Admin: change role
  @Put(':id/role')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  changeRole(@Param('id') id: string, @Body() body: ChangeRoleDto) {
    return this.usersService.changeRole(id, body.role);
  }

  // PUT /users/:id/deactivate - Admin: deactivate/reactivate
  @Put(':id/deactivate')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  setDeactivated(@Param('id') id: string, @Body() body: DeactivateUserDto) {
    return this.usersService.setDeactivated(id, body.isDeactivated);
  }

  // DELETE /users/:id - Admin: soft delete user
  @Delete(':id')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  // PUT /users/:id/verify-approve - Admin: approve verification & send email
  @Put(':id/verify-approve')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  approveVerification(@Param('id') id: string) {
    return this.usersService.approveVerification(id);
  }

  // PUT /users/:id/verify-reject - Admin: reject verification & send email
  @Put(':id/verify-reject')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  rejectVerification(@Param('id') id: string, @Body() body: RejectVerificationDto) {
    return this.usersService.rejectVerification(id, body.reason);
  }
}