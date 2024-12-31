module.exports = ({ meta, config, managers }) =>{
    return ({req, res, next})=>{
        console.log(req.headers); // Log the headers for debugging
        if(!req.headers.token){
            console.log('token required but not found')
            return managers.responseDispatcher.dispatch(res, {ok: false, code:401, errors: 'unauthorized'});
        }
        let decoded = null
        try {
            decoded = managers.token.verifyShortToken({token: req.headers.token});
            if(!decoded){
                console.log('failed to decode-1')
                return managers.responseDispatcher.dispatch(res, {ok: false, code:401, errors: 'unauthorized'});
            };
        } catch(err){
            console.log('failed to decode-2')
            return managers.responseDispatcher.dispatch(res, {ok: false, code:401, errors: 'unauthorized'});
        }
    
        next(decoded);
    }
}

// module.exports = function({ config, managers })  {
//     return async (req, res, next) => {
//         // Check if 'authorization' header is available and in the correct format
//         console.log(req.headers.authorization);
//         const authHeader = req.headers['authorization'];
//         if (!authHeader) {
//             return res.status(401).json({ error: 'Authorization header missing' });
//         }

//         // Extract the token from the 'Bearer <token>' format
//         const token = authHeader.split(' ')[1];  // This assumes 'Bearer <token>'
//         if (!token) {
//             return res.status(401).json({ error: 'Token missing' });
//         }

//         // Use TokenManager's verifyLongToken to validate the token
//         const decoded = managers.token.verifyLongToken({ token });
//         if (!decoded) {
//             return res.status(401).json({ error: 'Invalid or expired token' });
//         }

//         // Store the decoded user info in the request object for use in the route
//         req.user = decoded;

//         // Proceed to the next middleware or route handler
//         next();
//     };
// };
