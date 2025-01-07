import { Client, PermissionsBitField, TextChannel } from 'discord.js';

export interface TrackMetadata {
  title: string;
  artist: string;
  featuredArtists?: string | null;
  duration: number;
  releaseDate?: string;
  albumId?: string | null;
  type: 'track';
}

export interface AlbumMetadata {
  title: string;
  artist: string;
  releaseDate: string;
  trackCount: number;
  type: 'album';
}

export interface ArtistMetadata {
  name: string;
  bio?: string;
  isVerified: boolean;
  monthlyListeners: number;
  followers: number;
  type: 'artist';
}

type Metadata = TrackMetadata | AlbumMetadata;

const client = new Client({
  intents: ['Guilds', 'GuildMessages', 'MessageContent'],
});

const DISCORD_CHANNELS = {
  USERS: '1321400881672880139',
  NOTIFICATIONS: '1319345907959074857',
  AUDIO_TRACKS: '1319281353337868308',
  AUDIO_ALBUMS: '1319345885045456996',
  AUDIO_METADATA: '1319281378738573382',
  ARTIST_METADATA: '1325029939224772629',
};

// Kiểm tra token trước khi login
if (!process.env.DISCORD_BOT_TOKEN) {
  console.warn(
    'Warning: DISCORD_BOT_TOKEN is not set. Discord features will be disabled.'
  );
} else {
  client.login(process.env.DISCORD_BOT_TOKEN).catch((error) => {
    console.error('Discord login error:', error);
  });
}

// Hàm xử lý filename UTF-8
const sanitizeFilename = (filename: string, isAudio = true): string => {
  // Lấy extension gốc
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  // Loại bỏ extension
  const name = filename.replace(/\.[^/.]+$/, '');

  // Giữ nguyên tên gốc cho metadata
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Bỏ dấu
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Chỉ giữ lại chữ, số, khoảng trắng và dấu gạch ngang
    .trim()
    .replace(/\s+/g, '-'); // Thay khoảng trắng bằng dấu gạch ngang

  return `${normalized}.${ext}`;
};

export const sendUserNotification = async (message: string) => {
  if (!process.env.DISCORD_BOT_TOKEN) {
    console.warn('Discord notification skipped: Bot token not configured');
    return;
  }

  try {
    const channel = (await client.channels.fetch(
      DISCORD_CHANNELS.USERS
    )) as TextChannel;
    await channel.send(message);
  } catch (error) {
    console.error('Discord notification error:', error);
  }
};

export const uploadTrack = async (
  fileBuffer: Buffer,
  originalFilename: string,
  isAudio = true,
  isAlbumTrack = false,
  isMetadata = false,
  isArtistImage = false // Xác định hình ảnh của nghệ sĩ
): Promise<{ messageId: string; url: string }> => {
  try {
    let channelId;
    if (isArtistImage) {
      channelId = DISCORD_CHANNELS.ARTIST_METADATA;
    } else if (isMetadata || !isAudio) {
      channelId = DISCORD_CHANNELS.AUDIO_METADATA;
    } else if (isAlbumTrack) {
      channelId = DISCORD_CHANNELS.AUDIO_ALBUMS;
    } else {
      channelId = DISCORD_CHANNELS.AUDIO_TRACKS;
    }

    const channel = (await client.channels.fetch(channelId)) as TextChannel;

    // Xử lý filename an toàn
    const safeFilename = sanitizeFilename(originalFilename, isAudio);

    const message = await channel.send({
      files: [
        {
          attachment: fileBuffer,
          name: safeFilename,
          description: originalFilename, // Giữ tên gốc trong description
        },
      ],
    });

    const attachment = message.attachments.first();
    if (!attachment) {
      throw new Error('Failed to upload file to Discord');
    }

    return {
      messageId: message.id,
      url: attachment.url,
    };
  } catch (error) {
    console.error('Discord upload error:', error);
    throw error;
  }
};

export const saveMetadata = async (
  metadata: Metadata
): Promise<{ messageId: string }> => {
  try {
    const channel = (await client.channels.fetch(
      DISCORD_CHANNELS.AUDIO_METADATA
    )) as TextChannel;

    const fields = [
      {
        name: 'Type',
        value: metadata.type.charAt(0).toUpperCase() + metadata.type.slice(1),
        inline: true,
      },
      {
        name: metadata.type === 'track' ? 'Duration' : 'Track Count',
        value:
          metadata.type === 'track'
            ? `${Math.floor(metadata.duration / 60)}:${(metadata.duration % 60)
                .toString()
                .padStart(2, '0')}`
            : `${metadata.trackCount} tracks`,
        inline: true,
      },
      {
        name: metadata.type === 'track' ? 'Album ID' : 'Release Date',
        value:
          metadata.type === 'track'
            ? metadata.albumId || 'Single Track'
            : metadata.releaseDate,
        inline: true,
      },
    ];

    // Thêm trường Featured Artists nếu metadata là TrackMetadata
    if (metadata.type === 'track') {
      fields.push({
        name: 'Featured Artists',
        value: metadata.featuredArtists || 'None', // Thêm thông tin featured artists
        inline: true,
      });
    }

    const message = await channel.send({
      embeds: [
        {
          title: metadata.title,
          description: `Artist: ${metadata.artist}`,
          fields,
        },
      ],
    });

    return { messageId: message.id };
  } catch (error) {
    console.error('Discord metadata error:', error);
    throw error;
  }
};

export const saveTrackMetadata = async (
  metadata: TrackMetadata,
  messageId?: string // Tham số messageId để cập nhật message hiện có
): Promise<{ messageId: string }> => {
  try {
    const channel = (await client.channels.fetch(
      DISCORD_CHANNELS.AUDIO_METADATA
    )) as TextChannel;

    const fields = [
      {
        name: 'Type',
        value: metadata.type.charAt(0).toUpperCase() + metadata.type.slice(1),
        inline: true,
      },
      {
        name: 'Duration',
        value: `${Math.floor(metadata.duration / 60)}:${(metadata.duration % 60)
          .toString()
          .padStart(2, '0')}`,
        inline: true,
      },
      {
        name: 'Release Date',
        value: metadata.releaseDate || 'N/A',
        inline: true,
      },
      {
        name: 'Album ID',
        value: metadata.albumId || 'Single Track',
        inline: true,
      },
      {
        name: 'Featured Artists',
        value: metadata.featuredArtists || 'None',
        inline: true,
      },
    ];

    const embed = {
      title: metadata.title,
      description: `Artist: ${metadata.artist}`,
      fields,
    };

    if (messageId) {
      // Cập nhật message hiện có
      const message = await channel.messages.fetch(messageId);
      await message.edit({ embeds: [embed] });
      return { messageId: message.id };
    } else {
      // Tạo message mới nếu không có messageId
      const message = await channel.send({ embeds: [embed] });
      return { messageId: message.id };
    }
  } catch (error) {
    console.error('Discord track metadata error:', error);
    throw error;
  }
};

export const saveArtistMetadata = async (
  metadata: ArtistMetadata,
  messageId?: string // Tham số messageId để cập nhật message hiện có
): Promise<{ messageId: string }> => {
  try {
    const channel = (await client.channels.fetch(
      DISCORD_CHANNELS.ARTIST_METADATA
    )) as TextChannel;

    const embed = {
      title: metadata.name,
      description: metadata.bio || 'No bio provided',
      fields: [
        {
          name: 'Type',
          value: metadata.type,
          inline: true,
        },
        {
          name: 'Verified',
          value: metadata.isVerified ? 'Yes' : 'No',
          inline: true,
        },
        {
          name: 'Monthly Listeners',
          value: metadata.monthlyListeners.toString(),
          inline: true,
        },
        {
          name: 'Followers',
          value: metadata.followers.toString(),
          inline: true,
        },
      ],
    };

    if (messageId) {
      // Cập nhật message hiện có
      const message = await channel.messages.fetch(messageId);
      await message.edit({ embeds: [embed] });
      return { messageId: message.id };
    } else {
      // Tạo message mới nếu không có messageId
      const message = await channel.send({ embeds: [embed] });
      return { messageId: message.id };
    }
  } catch (error) {
    console.error('Discord artist metadata error:', error);
    throw error;
  }
};

export const updateAlbumMetadata = async (
  messageId: string,
  metadata: AlbumMetadata
) => {
  try {
    const channel = (await client.channels.fetch(
      DISCORD_CHANNELS.AUDIO_METADATA
    )) as TextChannel;

    const message = await channel.messages.fetch(messageId);
    if (!message) {
      throw new Error('Không tìm thấy message metadata');
    }

    await message.edit({
      embeds: [
        {
          title: metadata.title,
          description: `Artist: ${metadata.artist}`,
          fields: [
            {
              name: 'Type',
              value:
                metadata.type.charAt(0).toUpperCase() + metadata.type.slice(1),
              inline: true,
            },
            {
              name: 'Track Count',
              value: `${metadata.trackCount} tracks`,
              inline: true,
            },
            {
              name: 'Release Date',
              value: metadata.releaseDate,
              inline: true,
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error('Update Discord metadata error:', error);
    throw error;
  }
};

export const deleteAllDiscordMessages = async () => {
  try {
    // Lấy tất cả các kênh cần xóa tin nhắn
    const channels = Object.values(DISCORD_CHANNELS);

    for (const channelId of channels) {
      try {
        // Fetch kênh từ Discord
        const channel = (await client.channels.fetch(channelId)) as TextChannel;

        // Kiểm tra xem bot có quyền xóa tin nhắn không
        if (
          !channel
            .permissionsFor(client.user!)
            ?.has(PermissionsBitField.Flags.ManageMessages)
        ) {
          console.warn(
            `Bot không có quyền xóa tin nhắn trong kênh ${channelId}`
          );
          continue;
        }

        // Fetch tất cả tin nhắn trong kênh
        let messages = await channel.messages.fetch({ limit: 100 });

        // Lặp qua từng batch tin nhắn và xóa
        while (messages.size > 0) {
          // Xóa tất cả tin nhắn trong batch hiện tại
          await channel.bulkDelete(messages);

          console.log(
            `Đã xóa ${messages.size} tin nhắn trong kênh ${channelId}`
          );

          // Fetch lại tin nhắn tiếp theo
          messages = await channel.messages.fetch({ limit: 100 });

          // Thêm độ trễ 1 giây để tránh rate limits
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        console.log(`Đã xóa tất cả tin nhắn trong kênh ${channelId}`);
      } catch (error) {
        console.error(`Lỗi khi xử lý kênh ${channelId}:`, error);
      }
    }

    console.log('Đã xóa tất cả tin nhắn trong tất cả kênh.');
  } catch (error) {
    console.error('Lỗi khi xóa tin nhắn Discord:', error);
    throw error;
  }
};
