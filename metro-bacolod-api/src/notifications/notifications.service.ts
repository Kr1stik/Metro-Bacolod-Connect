import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class NotificationsService {
  private get db() {
    return admin.firestore();
  }

  // GET notifications for a user
  async getNotifications(userId: string, limit = 50) {
    const snapshot = await this.db
      .collection('notifications')
      .where('recipientId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  // CREATE a notification (OWASP A01: server-side sender info lookup)
  async createNotification(data: any) {
    // Fetch sender info server-side to prevent spoofing (OWASP A01)
    let senderName = data.senderName || '';
    let senderAvatar = data.senderAvatar || '';
    if (data.senderId) {
      try {
        const senderDoc = await this.db.collection('users').doc(data.senderId).get();
        if (senderDoc.exists) {
          const senderData = senderDoc.data();
          senderName = `${senderData?.firstName || ''} ${senderData?.lastName || ''}`.trim() || senderData?.displayName || senderName;
          senderAvatar = senderData?.photoURL || senderAvatar;
        }
      } catch {
        // If lookup fails, proceed with provided data
      }
    }

    const doc = await this.db.collection('notifications').add({
      ...data,
      senderName,
      senderAvatar,
      isRead: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { id: doc.id, message: 'Notification created' };
  }

  // MARK single notification as read
  async markAsRead(notificationId: string, userId: string) {
    const ref = this.db.collection('notifications').doc(notificationId);
    const doc = await ref.get();

    if (!doc.exists) throw new NotFoundException('Notification not found');
    if (doc.data()?.recipientId !== userId) {
      throw new ForbiddenException('Not authorized to modify this notification');
    }

    await ref.update({ isRead: true });
    return { message: 'Notification marked as read' };
  }

  // MARK ALL as read for a user
  async markAllAsRead(userId: string) {
    const snapshot = await this.db
      .collection('notifications')
      .where('recipientId', '==', userId)
      .where('isRead', '==', false)
      .get();

    const batch = this.db.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { isRead: true });
    });
    await batch.commit();

    return { message: `${snapshot.size} notifications marked as read` };
  }

  // GET unread count
  async getUnreadCount(userId: string) {
    const snapshot = await this.db
      .collection('notifications')
      .where('recipientId', '==', userId)
      .where('isRead', '==', false)
      .get();

    return { count: snapshot.size };
  }

  // DELETE a notification (OWASP A01: verify ownership)
  async deleteNotification(notificationId: string, userId: string) {
    const ref = this.db.collection('notifications').doc(notificationId);
    const doc = await ref.get();

    if (!doc.exists) throw new NotFoundException('Notification not found');
    if (doc.data()?.recipientId !== userId) {
      throw new ForbiddenException('Not authorized to delete this notification');
    }

    await ref.delete();
    return { message: 'Notification deleted' };
  }
}
