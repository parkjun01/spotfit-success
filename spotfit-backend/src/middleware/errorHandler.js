const errorHandler = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}:`, err.message);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: '이미 존재하는 데이터입니다' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ success: false, message: '참조하는 데이터가 존재하지 않습니다' });
  }

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? '서버 오류가 발생했습니다' : err.message,
  });
};

const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `${req.path} 경로를 찾을 수 없습니다` });
};

module.exports = { errorHandler, notFound };
