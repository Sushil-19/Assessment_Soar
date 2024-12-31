const bcrypt = require('bcrypt');
const TokenManager = require('../../entities/token/Token.manager');
const UserModel = require('./user.model');
const schoolModel = require('../schools/school.model')


module.exports = class UserController {
    constructor({ config }) {
        this.tokenManager = new TokenManager({ config });
        this.config = config;
    }

    async register(req, res) {
        const { username, email, password, isSuperUser, isAdminUser, schoolId } = req.body; // Added schoolId
        try {
            const existingUser = await UserModel.findOne({ email });
            if (existingUser) {
                return { errormsg: 'User already exists', statusCode: 409, error: true };
            }

            const schoolExists = await schoolModel.findById(schoolId);
            if (!schoolExists) {
                return { errormsg: 'School does not exist', statusCode:404, error: true };
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const newUser = new UserModel({
                username,
                email,
                password: hashedPassword,
                isSuperUser: isSuperUser || false,
                isAdminUser: isAdminUser || false,
                schoolId, // Added schoolId
            });

            await newUser.save();

            return { message: 'User registered successfully', statusCode: 201, error: false };
        } catch (error) {
            console.error(error);
            return { errormsg: 'Internal server error', statusCode: 500, error: true };
        }
    }

    async login(req, res) {
        const { email, password } = req.body;
        try {
            console.log(req.originalUrl);
            const user = await UserModel.findOne({ email });
            if (!user) {
                return { errormsg: 'User not found', statusCode: 404, error: true };
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return { errormsg: 'Invalid credentials', statusCode: 401, error: true };
            }

            const tokenPayload = {
                userId: user._id,
                userKey: user._id.toString(),
                username: user.username,
                email: user.email,
                isSuperUser: user.isSuperUser,
                isAdminUser: user.isAdminUser,
            };
            const longToken = this.tokenManager.genLongToken(tokenPayload);
            console.log(longToken);

            return {
                message: 'Login successful',
                token: longToken,
                statusCode: 200,
                error: false,
            };
        } catch (error) {
            console.error(error);
            return { errormsg: 'Internal server error', statusCode: 500, error: true };
        }
    }

    async getUserById(req, res) {
        const userId = req.params.id;
        try {
            if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
                return { errormsg: 'Invalid user ID format', statusCode: 400, error: true };
            }

            const user = await UserModel.findById(userId);
            if (!user) {
                return { errormsg: 'User not found', statusCode: 404, error: true };
            }
            return { data: user, statusCode: 200, error: false };
        } catch (error) {
            console.error(error);
            return { errormsg: 'Internal server error', statusCode: 500, error: true };
        }
    }

    async getUser(req, res) {
        try {
            const users = await UserModel.find();
            return { data: users, statusCode: 200, error: false };
        } catch (error) {
            console.error(error);
            return { errormsg: 'Internal server error', statusCode: 500, error: true };
        }
    }

    async updateUser(req, res) {
        const userId = req.params.id;
        const { username, email, password, isSuperUser, isAdminUser, schoolId } = req.body; // Added schoolId
        try {
            if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
                return { errormsg: 'Invalid user ID format', statusCode: 400, error: true };
            }

            const user = await UserModel.findById(userId);
            if (!user) {
                return { errormsg: 'User not found', statusCode: 404, error: true };
            }

            if (username) user.username = username;
            if (email) user.email = email;
            if (password) {
                const hashedPassword = await bcrypt.hash(password, 10);
                user.password = hashedPassword;
            }
            if (typeof isSuperUser === 'boolean') user.isSuperUser = isSuperUser;
            if (typeof isAdminUser === 'boolean') user.isAdminUser = isAdminUser;
            if (schoolId) user.schoolId = schoolId; // Added schoolId update

            await user.save();

            return { message: 'User updated successfully', statusCode: 200, error: false };
        } catch (error) {
            console.error(error);
            return { errormsg: 'Internal server error', statusCode: 500, error: true };
        }
    }

    async deleteUser(req, res) {
        const userId = req.params.id;
        try {
            if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
                return { errormsg: 'Invalid user ID format', statusCode: 400, error: true };
            }

            const user = await UserModel.findByIdAndDelete(userId);
            if (!user) {
                return { errormsg: 'User not found', statusCode: 404, error: true };
            }

            return { message: 'User deleted successfully', statusCode: 200, error: false };
        } catch (error) {
            console.error(error);
            return { errormsg: 'Internal server error', statusCode: 500, error: true };
        }
    }
};
