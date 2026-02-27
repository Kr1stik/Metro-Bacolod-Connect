import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class ReportsService {
  private get db() {
    return admin.firestore();
  }

  // CREATE a report (with duplicate guard)
  async createReport(reporterId: string, data: any) {
    // Check for existing report by same user on same target
    const existing = await this.db
      .collection('reports')
      .where('reporterId', '==', reporterId)
      .where('reportedId', '==', data.reportedId)
      .where('reportType', '==', data.reportType)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (!existing.empty) {
      throw new BadRequestException('You already have a pending report for this item.');
    }

    const doc = await this.db.collection('reports').add({
      ...data,
      reporterId,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { id: doc.id, message: 'Report submitted successfully' };
  }

  // GET ALL reports (admin only)
  async findAll(status?: string, limit = 50) {
    let query: admin.firestore.Query = this.db
      .collection('reports')
      .orderBy('createdAt', 'desc');

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.limit(limit).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  // GET single report
  async findOne(reportId: string) {
    const doc = await this.db.collection('reports').doc(reportId).get();
    if (!doc.exists) throw new NotFoundException('Report not found');
    return { id: doc.id, ...doc.data() };
  }

  // UPDATE report status (admin only)
  async updateStatus(reportId: string, adminId: string, status: string, adminNote?: string) {
    const ref = this.db.collection('reports').doc(reportId);
    const doc = await ref.get();
    if (!doc.exists) throw new NotFoundException('Report not found');

    await ref.update({
      status,
      adminNote: adminNote || null,
      resolvedBy: adminId,
      resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { message: `Report ${status}` };
  }

  // GET reports for a specific user
  async getReportsByUser(userId: string) {
    const snapshot = await this.db
      .collection('reports')
      .where('reporterId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
}
