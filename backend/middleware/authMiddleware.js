const jwt = require('jsonwebtoken');
const response = require('../utils/responceHandler');


const authMiddleware = (req, res, next) => {
    // const authToken = req.cookies?.auth_token

    // if (!authToken) {
    //     return response(res, 401, 'Unauthorized');
    // }

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) { 
        return response(res, 401, 'Authorization token missing or malformed');
    }

    const token = authHeader.split(' ')[1];
        
    try {
        
        const decode = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decode;
        next();
    } catch (error) {
        console.error('JWT verification error:', error);
        return response(res, 401, 'Unauthorized');
    }
}


module.exports = authMiddleware;