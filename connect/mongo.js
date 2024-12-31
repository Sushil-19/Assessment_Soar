const mongoose      = require('mongoose');
mongoose.Promise    = global.Promise;
const UserModel = require('../managers/models/users/user.model');
const bcrypt = require('bcrypt');

module.exports = ({uri})=>{
  //database connection
  mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });


  // When successfully connected
mongoose.connection.on('connected', async function () {
  console.log('💾  Mongoose default connection open to ' + uri);

  try {
      // Check if a user with the given username or email already exists
      const existingUser = await UserModel.findOne({
          $or: [
              { username: "superadmin" },
              { email: "super@gmail.com" }
          ]
      });

      if (existingUser) {
          console.log('User already exists:', existingUser);
      } else {
          const hashedPassword = await bcrypt.hash("admin", 10);
          const newUser = new UserModel({
              username: "superadmin",
              email: "super@gmail.com",
              password: hashedPassword,
              isSuperUser: true,
              isAdminUser: false,
              schoolId: null,
          });

          await newUser.save();
          console.log('New user created successfully');
      }
  } catch (error) {
      console.error('Error checking or creating user:', error);
  }
});


  // If the connection throws an error
  mongoose.connection.on('error',function (err) {
    console.log('💾  Mongoose default connection error: ' + err);
    console.log('=> if using local mongodb: make sure that mongo server is running \n'+
      '=> if using online mongodb: check your internet connection \n');
  });

  // When the connection is disconnected
  mongoose.connection.on('disconnected', function () {
    console.log('💾  Mongoose default connection disconnected');
  });

  // If the Node process ends, close the Mongoose connection
  process.on('SIGINT', function() {
    mongoose.connection.close(function () {
      console.log('💾  Mongoose default connection disconnected through app termination');
      process.exit(0);
    });
  });
}
