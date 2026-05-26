const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const setupChatSocket = (io) => {
  // Socket 인증 미들웨어
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const result = await query('SELECT id, nickname, profile_image, manner_score FROM users WHERE id=$1 AND is_active=true', [decoded.userId]);
      if (!result.rows[0]) return next(new Error('User not found'));
      socket.user = result.rows[0];
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // 채팅방 입장
    socket.on('join_spot', async ({ spotId }) => {
      try {
        const participation = await query(
          "SELECT * FROM participations WHERE spot_id=$1 AND user_id=$2 AND status='joined'",
          [spotId, socket.user.id]
        );
        if (!participation.rows[0]) {
          socket.emit('error', { message: '참여하지 않은 스팟입니다' });
          return;
        }

        socket.join(`spot:${spotId}`);
        socket.currentSpotId = spotId;

        // 최근 50개 메시지 로드
        const messages = await query(
          `SELECT cm.*, u.nickname, u.profile_image FROM chat_messages cm
           JOIN users u ON cm.user_id=u.id WHERE cm.spot_id=$1
           ORDER BY cm.created_at DESC LIMIT 50`,
          [spotId]
        );
        socket.emit('chat_history', messages.rows.reverse().map(formatMessage));

        // 입장 알림
        socket.to(`spot:${spotId}`).emit('user_joined', {
          userId: socket.user.id,
          nickname: socket.user.nickname,
        });
      } catch (err) { socket.emit('error', { message: '입장 실패' }); }
    });

    // 메시지 전송
    socket.on('send_message', async ({ message }) => {
      if (!socket.currentSpotId || !message?.trim()) return;
      try {
        const result = await query(
          'INSERT INTO chat_messages (spot_id,user_id,message,message_type) VALUES ($1,$2,$3,$4) RETURNING *',
          [socket.currentSpotId, socket.user.id, message.trim(), 'text']
        );
        const msg = formatMessage({ ...result.rows[0], nickname: socket.user.nickname, profile_image: socket.user.profile_image });
        io.to(`spot:${socket.currentSpotId}`).emit('new_message', msg);
      } catch (err) { socket.emit('error', { message: '메시지 전송 실패' }); }
    });

    // 운동 상태 공유 (FR-5 ini 요구사항)
    socket.on('update_status', ({ status }) => {
      const validStatuses = ['ready', 'in_progress', 'completed'];
      if (!socket.currentSpotId || !validStatuses.includes(status)) return;
      io.to(`spot:${socket.currentSpotId}`).emit('status_updated', {
        userId: socket.user.id,
        nickname: socket.user.nickname,
        status,
      });
    });

    // 호스트 공지 (공지 메시지)
    socket.on('send_notice', async ({ message, spotId }) => {
      try {
        const spot = await query('SELECT host_id FROM spots WHERE id=$1', [spotId]);
        if (spot.rows[0]?.host_id !== socket.user.id) {
          socket.emit('error', { message: '호스트만 공지를 보낼 수 있습니다' });
          return;
        }
        const result = await query(
          'INSERT INTO chat_messages (spot_id,user_id,message,message_type) VALUES ($1,$2,$3,$4) RETURNING *',
          [spotId, socket.user.id, message, 'notice']
        );
        const msg = formatMessage({ ...result.rows[0], nickname: socket.user.nickname, profile_image: socket.user.profile_image });
        io.to(`spot:${spotId}`).emit('new_notice', msg);
      } catch (err) { socket.emit('error', { message: '공지 전송 실패' }); }
    });

    socket.on('leave_spot', () => {
      if (socket.currentSpotId) {
        socket.leave(`spot:${socket.currentSpotId}`);
        socket.to(`spot:${socket.currentSpotId}`).emit('user_left', { userId: socket.user.id, nickname: socket.user.nickname });
        socket.currentSpotId = null;
      }
    });

    socket.on('disconnect', () => {
      if (socket.currentSpotId) {
        socket.to(`spot:${socket.currentSpotId}`).emit('user_left', { userId: socket.user.id, nickname: socket.user.nickname });
      }
    });
  });
};

const formatMessage = (m) => ({
  id: m.id,
  userId: m.user_id,
  nickname: m.nickname,
  profileImage: m.profile_image,
  message: m.message,
  messageType: m.message_type,
  createdAt: m.created_at,
});

module.exports = { setupChatSocket };
