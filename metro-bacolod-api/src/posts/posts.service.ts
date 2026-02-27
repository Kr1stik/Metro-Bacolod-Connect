import { Injectable, Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class PostsService {
  constructor(
    @Inject('FIREBASE_CONNECTION') private readonly firestore: admin.app.App,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // 1. CREATE POST
  async create(createPostDto: any) {
    const collection = this.firestore.firestore().collection('posts');
    const newDoc = await collection.add({
      ...createPostDto,
      // Ensure we save an array. If for some reason it's missing, save empty array.
      images: createPostDto.images || [], 
      likes: 0,
      likedBy: [],
      savedBy: [],
      isArchived: false,
      createdAt: new Date().toISOString(),
    });
    return { id: newDoc.id, ...createPostDto };
  }

  /// UPDATED FIND ALL
  async findAll(userLocation?: string) {
    const snapshot = await this.firestore.firestore()
      .collection('posts')
      .orderBy('createdAt', 'desc')
      .get();
      
    let posts = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((post: any) => !post.isArchived);

    // THE ALGORITHM:
    // If we know the user's location, move those posts to the top
    if (userLocation && userLocation !== "Others / Foreign") {
      posts.sort((a: any, b: any) => {
        const aMatch = a.location === userLocation;
        const bMatch = b.location === userLocation;
        
        if (aMatch && !bMatch) return -1; // a comes first
        if (!aMatch && bMatch) return 1;  // b comes first
        return 0; // No change
      });
    }

    return posts;
  }
  // 3. TOGGLE LIKE
  async toggleLike(postId: string, userId: string) {
    const postRef = this.firestore.firestore().collection('posts').doc(postId);
    const post = await postRef.get();

    if (!post.exists) throw new Error('Post not found');

    const data = post.data();
    const likedBy = data?.likedBy || [];
    let likes = data?.likes || 0;

    if (likedBy.includes(userId)) {
      await postRef.update({
        likedBy: admin.firestore.FieldValue.arrayRemove(userId),
        likes: admin.firestore.FieldValue.increment(-1)
      });
      likes--;
    } else {
      await postRef.update({
        likedBy: admin.firestore.FieldValue.arrayUnion(userId),
        likes: admin.firestore.FieldValue.increment(1)
      });
      likes++;
    }

    return { likes };
  }

  // UPDATED: DELETE POST (Soft Delete + Cloudinary cleanup)
  async delete(postId: string, userId: string) {
    const postRef = this.firestore.firestore().collection('posts').doc(postId);
    const post = await postRef.get();

    if (!post.exists) throw new Error('Post not found');
    if (post.data()?.userId !== userId) throw new Error('Unauthorized');

    // Clean up Cloudinary images
    const images: string[] = post.data()?.images || [];
    if (images.length > 0) {
      await this.cloudinaryService.deleteImagesByUrls(images).catch((err) => {
        console.error('Cloudinary cleanup failed:', err);
      });
    }

    // Soft delete
    await postRef.update({ isArchived: true, deletedAt: new Date().toISOString() });
    return { message: 'Post moved to trash' };
  }

  // NEW: RESTORE POST (Undo)
  async restore(postId: string, userId: string) {
    const postRef = this.firestore.firestore().collection('posts').doc(postId);
    const post = await postRef.get();

    if (!post.exists) throw new Error('Post not found');
    if (post.data()?.userId !== userId) throw new Error('Unauthorized');

    await postRef.update({ isArchived: false, deletedAt: admin.firestore.FieldValue.delete() });
    return { message: 'Post restored' };
  }

  // 5. UPDATE POST (handles all editable fields)
  async update(postId: string, userId: string, updateData: any) {
    const postRef = this.firestore.firestore().collection('posts').doc(postId);
    const post = await postRef.get();

    if (!post.exists) throw new Error('Post not found');
    if (post.data()?.userId !== userId) throw new Error('Unauthorized');

    // Only pick allowed fields to prevent overwriting system fields
    const allowedFields = [
      'title', 'content', 'location', 'price', 'status', 'type',
      'rooms', 'bathrooms', 'lotArea', 'floorArea', 'yearBuilt',
      'amenities', 'images', 'pinCoords',
    ];

    const sanitized: Record<string, any> = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        sanitized[field] = updateData[field];
      }
    }

    sanitized.updatedAt = new Date().toISOString();
    await postRef.update(sanitized);
    return { message: 'Post updated' };
  }

  // 6. TOGGLE SAVE (The new function)
  async toggleSave(postId: string, userId: string) {
    const postRef = this.firestore.firestore().collection('posts').doc(postId);
    
    const post = await postRef.get();
    const savedBy = post.data()?.savedBy || [];

    if (savedBy.includes(userId)) {
      await postRef.update({
        savedBy: admin.firestore.FieldValue.arrayRemove(userId)
      });
      return { saved: false };
    } else {
      await postRef.update({
        savedBy: admin.firestore.FieldValue.arrayUnion(userId)
      });
      return { saved: true };
    }
  }

} // <--- THIS BRACKET WAS LIKELY MISSING OR IN THE WRONG SPOT