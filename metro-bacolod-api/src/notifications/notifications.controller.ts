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
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
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

  // POST /notifications - create a notification
  @Post()
  create(@Body() body: CreateNotificationDto, @Req() req: any) {
    return this.notificationsService.createNotification({
      ...body,
      senderId: req.user.uid,
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
