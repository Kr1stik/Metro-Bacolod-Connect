import { Controller, Post, Get, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
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

  // GET /users/search?q=name - Search users (OWASP A04: stricter rate limit)
  @Get('search')
  @UseGuards(FirebaseAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 30 } })
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

  // PUT /users/:id/role - Admin: change role (OWASP A07: revokes tokens)
  @Put(':id/role')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  changeRole(@Param('id') id: string, @Body() body: ChangeRoleDto, @Req() req: any) {
    return this.usersService.changeRole(id, body.role, req.user.uid, req.user.email);
  }

  // PUT /users/:id/deactivate - Admin: deactivate/reactivate
  @Put(':id/deactivate')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  setDeactivated(@Param('id') id: string, @Body() body: DeactivateUserDto, @Req() req: any) {
    return this.usersService.setDeactivated(id, body.isDeactivated, req.user.uid, req.user.email);
  }

  // DELETE /users/:id - Admin: soft delete user
  @Delete(':id')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  deleteUser(@Param('id') id: string, @Req() req: any) {
    return this.usersService.deleteUser(id, req.user.uid, req.user.email);
  }

  // PUT /users/:id/verify-approve - Admin: approve verification & send email (OWASP A04: strict rate limit)
  @Put(':id/verify-approve')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  approveVerification(@Param('id') id: string, @Req() req: any) {
    return this.usersService.approveVerification(id, req.user.uid, req.user.email);
  }

  // PUT /users/:id/verify-reject - Admin: reject verification & send email (OWASP A04: strict rate limit)
  @Put(':id/verify-reject')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  rejectVerification(@Param('id') id: string, @Body() body: RejectVerificationDto, @Req() req: any) {
    return this.usersService.rejectVerification(id, body.reason, req.user.uid, req.user.email);
  }
}