import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import * as sanitizeHtmlModule from 'sanitize-html';

const sanitizeHtml = (sanitizeHtmlModule as any).default || sanitizeHtmlModule;

/** Strip all HTML/script from user text fields (OWASP A03) */
function sanitize(text: string | undefined): string | undefined {
  if (!text) return text;
  return sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} });
}

@Injectable()
export class PostsService {
  constructor(
    @Inject('FIREBASE_CONNECTION') private readonly firestore: admin.app.App,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // 1. CREATE POST (OWASP A03: sanitize text fields)
  async create(createPostDto: any) {
    const collection = this.firestore.firestore().collection('posts');
    const sanitizedDto = {
      ...createPostDto,
      title: sanitize(createPostDto.title),
      content: sanitize(createPostDto.content),
      location: sanitize(createPostDto.location),
      images: createPostDto.images || [],
      likes: 0,
      likedBy: [],
      savedBy: [],
      isArchived: false,
      createdAt: new Date().toISOString(),
    };
    // Strip undefined values — Firestore rejects them
    Object.keys(sanitizedDto).forEach(key => {
      if (sanitizedDto[key] === undefined) delete sanitizedDto[key];
    });
    const newDoc = await collection.add(sanitizedDto);
    return { id: newDoc.id, ...sanitizedDto };
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

    if (!post.exists) throw new NotFoundException('Post not found');

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

  // UPDATED: DELETE POST (Soft Delete + Cloudinary cleanup) (OWASP A01: admin bypass)
  async delete(postId: string, userId: string, isAdmin = false) {
    const postRef = this.firestore.firestore().collection('posts').doc(postId);
    const post = await postRef.get();

    if (!post.exists) throw new NotFoundException('Post not found');
    if (!isAdmin && post.data()?.userId !== userId) throw new ForbiddenException('Not authorized to delete this post');

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

  // NEW: RESTORE POST (Undo) (OWASP A01: admin bypass)
  async restore(postId: string, userId: string, isAdmin = false) {
    const postRef = this.firestore.firestore().collection('posts').doc(postId);
    const post = await postRef.get();

    if (!post.exists) throw new NotFoundException('Post not found');
    if (!isAdmin && post.data()?.userId !== userId) throw new ForbiddenException('Not authorized to restore this post');

    await postRef.update({ isArchived: false, deletedAt: admin.firestore.FieldValue.delete() });
    return { message: 'Post restored' };
  }

  // 5. UPDATE POST (handles all editable fields) (OWASP A01: admin bypass, A03: sanitize)
  async update(postId: string, userId: string, updateData: any, isAdmin = false) {
    const postRef = this.firestore.firestore().collection('posts').doc(postId);
    const post = await postRef.get();

    if (!post.exists) throw new NotFoundException('Post not found');
    if (!isAdmin && post.data()?.userId !== userId) throw new ForbiddenException('Not authorized to update this post');

    // Only pick allowed fields to prevent overwriting system fields
    const allowedFields = [
      'title', 'content', 'location', 'price', 'status', 'type',
      'rooms', 'bathrooms', 'lotArea', 'floorArea', 'yearBuilt',
      'amenities', 'images', 'pinCoords',
    ];

    const textFields = ['title', 'content', 'location'];
    const cleaned: Record<string, any> = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        // OWASP A03: sanitize text fields
        cleaned[field] = textFields.includes(field) ? sanitize(updateData[field]) : updateData[field];
      }
    }

    cleaned.updatedAt = new Date().toISOString();
    await postRef.update(cleaned);
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