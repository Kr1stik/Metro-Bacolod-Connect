import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('create')
  @UseGuards(FirebaseAuthGuard)
  create(@Body() body: CreateUserDto, @Req() req: any) {
    // Ensure the authenticated user can only create their own profile
    const authenticatedUid = req.user.uid;
    if (body.uid && body.uid !== authenticatedUid) {
      throw new Error('Cannot create profile for another user.');
    }
    return this.usersService.createUser({ ...body, uid: authenticatedUid });
  }
}