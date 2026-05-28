const jwt = require('jsonwebtoken');

const socketMiddleware = (socket, next) => {
  

  
  const token = socket.handshake.auth?.token || socket.handshake.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return next(new Error('Authorization token missing'));
  }
  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decode;
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    return next(new Error('Unauthorized'));
  }
};

module.exports = socketMiddleware;
