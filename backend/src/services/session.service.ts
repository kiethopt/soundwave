import { Role, User } from '@prisma/client';
import pusher from '../config/pusher';
import { client as redis } from '../middleware/cache.middleware';
import { randomUUID } from 'crypto';

class SessionService {
  private readonly SESSION_TTL = 24 * 60 * 60; // 24 hours in seconds

  // Lưu trữ session trong Redis với format: userId:sessionId
  private async saveSession(
    userId: string,
    sessionId: string,
    role: Role,
    currentProfile: string = 'USER'
  ): Promise<void> {
    await redis.hSet(
      `user_sessions:${userId}`,
      sessionId,
      JSON.stringify({
        role,
        currentProfile,
        createdAt: Date.now(),
      })
    );
    await redis.expire(`user_sessions:${userId}`, this.SESSION_TTL);
  }

  // Xóa một session cụ thể
  private async removeSession(
    userId: string,
    sessionId: string
  ): Promise<void> {
    await redis.hDel(`user_sessions:${userId}`, sessionId);
  }

  // Lấy tất cả session của user
  private async getUserSessions(userId: string): Promise<string[]> {
    const sessions = await redis.hGetAll(`user_sessions:${userId}`);
    return Object.keys(sessions);
  }

  // Tạo session mới khi user login
  async createSession(user: User): Promise<string> {
    const sessionId = randomUUID();
    await this.saveSession(user.id, sessionId, Role.USER, user.currentProfile);
    return sessionId;
  }

  // Xóa session khi user logout
  async removeUserSession(userId: string, sessionId: string): Promise<void> {
    await this.removeSession(userId, sessionId);
  }

  // Kiểm tra session có hợp lệ không
  async validateSession(userId: string, sessionId: string): Promise<boolean> {
    const sessions = await this.getUserSessions(userId);
    if (!sessions.includes(sessionId)) {
      return false;
    }

    // Refresh session TTL khi validate thành công
    await redis.expire(`user_sessions:${userId}`, this.SESSION_TTL);
    return true;
  }

  // Cập nhật role trong session khi chuyển đổi profile
  async updateSessionProfile(
    userId: string,
    sessionId: string,
    currentProfile: string
  ): Promise<void> {
    const sessionData = {
      role: Role.USER, // Role luôn là USER
      currentProfile,
      createdAt: Date.now(),
    };
    await redis.hSet(
      `user_sessions:${userId}`,
      sessionId,
      JSON.stringify(sessionData)
    );
    await redis.expire(`user_sessions:${userId}`, this.SESSION_TTL);
  }

  // Xử lý khi user bắt đầu phát nhạc
  async handleAudioPlay(
    userId: string,
    currentSessionId: string
  ): Promise<void> {
    const sessions = await this.getUserSessions(userId);

    // Gửi thông báo tới các session khác để dừng phát nhạc
    await pusher.trigger(`user-${userId}`, 'audio-control', {
      type: 'STOP_OTHER_SESSIONS',
      currentSessionId,
    });
  }
}

export const sessionService = new SessionService();
