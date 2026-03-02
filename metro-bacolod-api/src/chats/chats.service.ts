import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class ChatsService {
  private get db() {
    return admin.firestore();
  }

  // GET USER'S CHATS
  async getChats(uid: string) {
    const snapshot = await this.db.collection('chats')
      .where('participants', 'array-contains', uid)
      .orderBy('updatedAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // GET OR CREATE CHAT between two users
  async getOrCreateChat(uid: string, otherUid: string) {
    // Check if chat already exists
    const existing = await this.db.collection('chats')
      .where('participants', 'array-contains', uid)
      .get();

    const found = existing.docs.find(doc => {
      const data = doc.data();
      return data.participants.includes(otherUid);
    });

    if (found) return { id: found.id, ...found.data() };

    // Fetch both users' info for the chat
    const [userDoc, otherDoc] = await Promise.all([
      this.db.collection('users').doc(uid).get(),
      this.db.collection('users').doc(otherUid).get(),
    ]);

    const userData = userDoc.data();
    const otherData = otherDoc.data();

    const users: Record<string, any> = {};
    users[uid] = {
      name: `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || userData?.displayName || 'User',
      avatar: userData?.photoURL || `https://ui-avatars.com/api/?name=${userData?.firstName || 'U'}`,
    };
    users[otherUid] = {
      name: `${otherData?.firstName || ''} ${otherData?.lastName || ''}`.trim() || otherData?.displayName || 'User',
      avatar: otherData?.photoURL || `https://ui-avatars.com/api/?name=${otherData?.firstName || 'U'}`,
    };

    const newChat = await this.db.collection('chats').add({
      participants: [uid, otherUid],
      users,
      lastMessage: '',
      hasUnread: { [uid]: false, [otherUid]: false },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const chat = await newChat.get();
    return { id: chat.id, ...chat.data() };
  }

  // GET MESSAGES in a chat
  async getMessages(chatId: string, uid: string, limit = 50) {
    // Verify user is participant
    const chatDoc = await this.db.collection('chats').doc(chatId).get();
    if (!chatDoc.exists) throw new NotFoundException('Chat not found');
    if (!chatDoc.data()?.participants.includes(uid)) throw new ForbiddenException('Not a participant');

    const snapshot = await this.db.collection(`chats/${chatId}/messages`)
      .orderBy('createdAt', 'asc')
      .limitToLast(limit)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // SEND MESSAGE
  async sendMessage(chatId: string, uid: string, data: { text?: string; imageUrl?: string }) {
    const chatDoc = await this.db.collection('chats').doc(chatId).get();
    if (!chatDoc.exists) throw new NotFoundException('Chat not found');

    const chatData = chatDoc.data();
    if (!chatData?.participants.includes(uid)) throw new ForbiddenException('Not a participant');

    const messageData: any = {
      senderId: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (data.text) messageData.text = data.text;
    if (data.imageUrl) messageData.imageUrl = data.imageUrl;

    const msgRef = await this.db.collection(`chats/${chatId}/messages`).add(messageData);

    // Update chat metadata
    const otherUid = chatData.participants.find((p: string) => p !== uid);
    await this.db.collection('chats').doc(chatId).update({
      lastMessage: data.imageUrl ? '📷 Sent an image' : (data.text || ''),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      [`hasUnread.${otherUid}`]: true,
    });

    return { id: msgRef.id, ...messageData };
  }

  // DELETE MESSAGE
  async deleteMessage(chatId: string, messageId: string, uid: string) {
    const chatDoc = await this.db.collection('chats').doc(chatId).get();
    if (!chatDoc.exists) throw new NotFoundException('Chat not found');
    if (!chatDoc.data()?.participants.includes(uid)) throw new ForbiddenException('Not a participant');

    const msgDoc = await this.db.collection(`chats/${chatId}/messages`).doc(messageId).get();
    if (!msgDoc.exists) throw new NotFoundException('Message not found');
    if (msgDoc.data()?.senderId !== uid) throw new ForbiddenException('Can only delete own messages');

    await this.db.collection(`chats/${chatId}/messages`).doc(messageId).delete();
    return { message: 'Message deleted' };
  }

  // MARK AS READ (OWASP A01: verify participant before updating)
  async markAsRead(chatId: string, uid: string) {
    const chatDoc = await this.db.collection('chats').doc(chatId).get();
    if (!chatDoc.exists) throw new NotFoundException('Chat not found');
    if (!chatDoc.data()?.participants.includes(uid)) throw new ForbiddenException('Not a participant');

    await this.db.collection('chats').doc(chatId).update({
      [`hasUnread.${uid}`]: false,
      [`lastRead.${uid}`]: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { message: 'Marked as read' };
  }

  // SET TYPING STATUS
  async setTypingStatus(chatId: string, uid: string, isTyping: boolean) {
    const chatDoc = await this.db.collection('chats').doc(chatId).get();
    if (!chatDoc.exists) throw new NotFoundException('Chat not found');
    if (!chatDoc.data()?.participants.includes(uid)) throw new ForbiddenException('Not a participant');

    await this.db.collection('chats').doc(chatId).update({
      [`typing.${uid}`]: isTyping ? admin.firestore.FieldValue.serverTimestamp() : admin.firestore.FieldValue.delete(),
    });
    return { message: isTyping ? 'Typing' : 'Stopped typing' };
  }
}
