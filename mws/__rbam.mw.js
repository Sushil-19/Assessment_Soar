// const User = require('../managers/models/users/user.model'); // Adjust the path to your User model

// module.exports = function ({ config, managers, allowedRoles }) {
//     return async (req, res, next) => {
//         const authHeader = req.headers['authorization'];
//         console.log(authHeader);

//         // Check if 'authorization' header is available and in the correct format
//         if (!authHeader) {
//             return res.status(401).json({ error: 'Authorization header missing' });
//         }

//         // Extract the token from the 'Bearer <token>' format
//         const token = authHeader.split(' ')[1]; // This assumes 'Bearer <token>'
//         if (!token) {
//             return res.status(401).json({ error: 'Token missing' });
//         }

//         try {
//             // Use TokenManager's verifyLongToken to validate the token
//             const decoded = await managers.token.verifyLongToken({ token });
//             console.log('Decoded token:', decoded);

//             if (!decoded) {
//                 return res.status(401).json({ error: 'Invalid or expired token' });
//             }

//             // Query MongoDB to check if the user exists
//             const user = await User.findById(decoded.userId).exec();
//             if (!user) {
//                 console.log('User not found:', decoded.userId);
//                 return res.status(404).json({ error: 'User not found' });
//             }

//             // Check if the user's role matches one of the allowed roles
//             if (!allowedRoles.includes(user.isAdminUser ? 'admin' : 'superUser')) {
//                 console.log('Access denied. User does not have the required role:', user._id);
//                 return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
//             }

//             console.log('User has the required permissions:', user._id);

//             // Attach user and role to the request object for further use
//             req.user = { id: user._id, role: user.isAdminUser ? 'admin' : 'superUser' };

//             // Proceed to the next middleware or route handler
//             next();
//         } catch (error) {
//             console.error('Error in middleware:', error);
//             return res.status(500).json({ error: 'Internal Server Error' });
//         }
//     };
// };

const User = require('../managers/models/users/user.model');

module.exports = function ({ config, managers }) {
    return async (req, res, next) => {
        console.log(req.originalUrl);

        if (req.originalUrl !== '/api/user/login') {
            const authHeader = req.headers['authorization'];

            if (!authHeader) {
                return res.status(401).json({ error: 'Authorization header missing' });
            }

            const token = authHeader.split(' ')[1];
            if (!token) {
                return res.status(401).json({ error: 'Token missing' });
            }

            try {
                const decoded = await managers.token.verifyLongToken({ token });
                if (!decoded) {
                    return res.status(401).json({ error: 'Invalid or expired token' });
                }

                const user = await User.findById(decoded.userId).exec();
                console.log("<<<<<<<<<<<<<", user);
                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }

                const userRole = user.isSuperUser ? 'superUser' : 'admin';
                console.log("User role is: ", userRole);

                const allowedApis = getPermissionsByRole(userRole);
                console.log("The allowed APIs are: ", allowedApis);
                console.log((req.originalUrl.split('/')[3]), '++++++++++');

                if (!allowedApis.includes(req.originalUrl.split('/')[3])) {
                    console.log('Access denied. User does not have the required API permission:', user._id);
                    return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
                }

                req.user = { id: user._id, role: userRole, school_id: user.schoolId };
                return next(); // Ensure the function terminates after calling next()
            } catch (error) {
                console.error('Error in middleware:', error);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
        } else {
            console.log('Login is called, middleware not applied');
            return next(); // Return to avoid double calls to next()
        }
    };
};

function getPermissionsByRole(role) {
    console.log("In getPermissions");
    const rolePermissions = {
        admin: [
            'login',
            'getUser',

            'createStudent',
            'deleteStudent',
            'getStudents',
            'getStudentById',
            'updateStudent',

            'createClassroom',
            'deleteClassroom',
            'getClassrooms',
            'getClassroomById',
            'updateClassroom',
        ],
        superUser: [
            'login',
            'register',

            'updateUser',
            'deleteUser',
            'getUser',

            'createSchool',
            'deleteSchool',
            'getSchools',
            'getSchoolById',
            'updateSchool',

            'createStudent',
            'deleteStudent',
            'getStudents',
            'getStudentById',
            'updateStudent',

            'createClassroom',
            'deleteClassroom',
            'getClassrooms',
            'getClassroomById',
            'updateClassroom',
        ],
    };
    return rolePermissions[role] || [];
}
