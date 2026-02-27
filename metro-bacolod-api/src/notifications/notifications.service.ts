import { Injectable, NotFoundException } from '@nestjs/common';
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

  // CREATE a notification
  async createNotification(data: any) {
    const doc = await this.db.collection('notifications').add({
      ...data,
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
      throw new Error('Unauthorized');
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

  // DELETE a notification
  async deleteNotification(notificationId: string, userId: string) {
    const ref = this.db.collection('notifications').doc(notificationId);
    const doc = await ref.get();

    if (!doc.exists) throw new NotFoundException('Notification not found');
    if (doc.data()?.recipientId !== userId) {
      throw new Error('Unauthorized');
    }

    await ref.delete();
    return { message: 'Notification deleted' };
  }
}
