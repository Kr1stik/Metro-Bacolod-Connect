import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { CreateNotificationDto } from './dto/notification.dto';

@Controller('notifications')
@UseGuards(FirebaseAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // GET /notifications - list own notifications
  @Get()
  getNotifications(@Req() req: any, @Query('limit') limit?: string) {
    return this.notificationsService.getNotifications(
      req.user.uid,
      limit ? parseInt(limit) : 50,
    );
  }

  // GET /notifications/unread-count
  @Get('unread-count')
  getUnreadCount(@Req() req: any) {
    return this.notificationsService.getUnreadCount(req.user.uid);
  }

  // POST /notifications - create a notification (OWASP A01: restricted to system/admin actions)
  // Users can only create notifications where they are the sender
  // They cannot impersonate other users as the sender
  @Post()
  create(@Body() body: CreateNotificationDto, @Req() req: any) {
    // Prevent users from setting an arbitrary senderId different from themselves
    if (body.senderId && body.senderId !== req.user.uid) {
      throw new ForbiddenException('Cannot create notifications on behalf of another user.');
    }
    return this.notificationsService.createNotification({
      ...body,
      senderId: req.user.uid,
    });
  }

  // POST /notifications/system - Admin only: create system notifications for any user
  @Post('system')
  @UseGuards(AdminGuard)
  createSystemNotification(@Body() body: CreateNotificationDto) {
    return this.notificationsService.createNotification({
      ...body,
      senderId: 'system',
    });
  }

  // PUT /notifications/read-all - mark all as read
  @Put('read-all')
  markAllAsRead(@Req() req: any) {
    return this.notificationsService.markAllAsRead(req.user.uid);
  }

  // PUT /notifications/:id/read - mark single as read
  @Put(':id/read')
  markAsRead(@Param('id') id: string, @Req() req: any) {
    return this.notificationsService.markAsRead(id, req.user.uid);
  }

  // DELETE /notifications/:id
  @Delete(':id')
  deleteNotification(@Param('id') id: string, @Req() req: any) {
    return this.notificationsService.deleteNotification(id, req.user.uid);
  }
}
