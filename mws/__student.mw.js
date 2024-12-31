const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../managers/models/users/user.model'); // Adjust the path to your User model

module.exports = function({ config, managers }) {
    return async (req, res, next) => {
        const authHeader = req.headers['authorization'];
        console.log(authHeader);

        // Check if 'authorization' header is available and in the correct format
        if (!authHeader) {
            return res.status(401).json({ error: 'Authorization header missing' });
        }

        // Extract the token from the 'Bearer <token>' format
        const token = authHeader.split(' ')[1]; // This assumes 'Bearer <token>'
        if (!token) {
            return res.status(401).json({ error: 'Token missing' });
        }

        try {
            // Use TokenManager's verifyLongToken to validate the token
            const decoded = await managers.token.verifyLongToken({ token });
            console.log('Decoded token:', decoded);

            if (!decoded) {
                return res.status(401).json({ error: 'Invalid or expired token' });
            }

            // Query MongoDB to check if the user exists
            const user = await User.findById(decoded.userId).exec();
            if (!user) {
                console.log('User not found:', decoded.userId);
                return res.status(404).json({ error: 'User not found' });
            }

            // Check if the user has admin rights
            if (!user.isAdminUser) {
                console.log('Access denied. User is not an admin:', user._id);
                return res.status(403).json({ error: 'Access denied. Admins only.' });
            }

            console.log('User is an admin:', user._id);

            // Store the decoded user info in the request object for use in the route
            req.user = decoded;

            // Proceed to the next middleware or route handler
            next();
        } catch (error) {
            console.error('Error in middleware:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    };
};
