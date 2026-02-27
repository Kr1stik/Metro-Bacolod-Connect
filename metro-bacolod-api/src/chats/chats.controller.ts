import { Controller, Get, Post, Delete, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { SendMessageDto, CreateChatDto } from './dto/chat.dto';

@Controller('chats')
@UseGuards(FirebaseAuthGuard)
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  // GET /chats - Get user's chats
  @Get()
  getChats(@Req() req: any) {
    return this.chatsService.getChats(req.user.uid);
  }

  // POST /chats - Get or create chat with another user
  @Post()
  getOrCreateChat(@Body() body: CreateChatDto, @Req() req: any) {
    const otherUid = body.participants.find(p => p !== req.user.uid);
    if (!otherUid) throw new Error('Must include another participant');
    return this.chatsService.getOrCreateChat(req.user.uid, otherUid);
  }

  // GET /chats/:id/messages - Get messages in a chat
  @Get(':id/messages')
  getMessages(@Param('id') id: string, @Req() req: any, @Query('limit') limit?: string) {
    return this.chatsService.getMessages(id, req.user.uid, limit ? parseInt(limit) : 50);
  }

  // POST /chats/:id/messages - Send a message
  @Post(':id/messages')
  sendMessage(@Param('id') id: string, @Body() body: SendMessageDto, @Req() req: any) {
    return this.chatsService.sendMessage(id, req.user.uid, body);
  }

  // DELETE /chats/:id/messages/:messageId - Delete a message
  @Delete(':id/messages/:messageId')
  deleteMessage(@Param('id') id: string, @Param('messageId') messageId: string, @Req() req: any) {
    return this.chatsService.deleteMessage(id, messageId, req.user.uid);
  }

  // PUT /chats/:id/read - Mark chat as read
  @Put(':id/read')
  markAsRead(@Param('id') id: string, @Req() req: any) {
    return this.chatsService.markAsRead(id, req.user.uid);
  }
}
