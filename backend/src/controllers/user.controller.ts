import { Request, Response } from 'express';
import prisma from '../config/db';
import { Role } from '@prisma/client';

const userSelect = {
  id: true,
  email: true,
  username: true,
  avatar: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
  ArtistProfile: {
    select: {
      id: true,
      artistName: true,
      bio: true,
      avatar: true,
      socialMediaLinks: true,
      monthlyListeners: true,
      isVerified: true,
      verificationRequestedAt: true,
      verifiedAt: true,
      genres: {
        select: {
          genre: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  },
};

export const followUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;

    // Kiểm tra xem người dùng đã follow chưa
    const existingFollow = await prisma.userFollowArtist.findFirst({
      where: {
        followerId: user?.id,
        followingId: id,
      },
    });

    if (existingFollow) {
      res.status(400).json({ message: 'Already following this user' });
      return;
    }

    // Tạo follow mới
    await prisma.userFollowArtist.create({
      data: {
        follower: { connect: { id: user?.id } },
        following: { connect: { id } },
      },
    });

    res.json({ message: 'User followed successfully' });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 

export const unfollowUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;

    // Kiểm tra xem người dùng đã follow chưa
    const existingFollow = await prisma.userFollowArtist.findFirst({
      where: {
        followerId: user?.id,
        followingId: id,
      },
    });

    if (!existingFollow) {
      res.status(400).json({ message: 'Not following this user' });
      return;
    }

    // Xóa follow
    await prisma.userFollowArtist.delete({
      where: {
        id: existingFollow.id,
      },
    });

    res.json({ message: 'User unfollowed successfully' });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const getFollowers = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;

    const followers = await prisma.userFollowArtist.findMany({
      where: {
        followingId: user?.id,
      },
      select: {
        followerId: true,
      },
    });

    res.json(followers);
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const getFollowing = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;

    const following = await prisma.userFollowArtist.findMany({
      where: {
        followerId: user?.id,
      },
      select: {
        followingId: true,
      },
    });

    res.json(following);
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}