import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {type: String, required: true},
  email: {type: String, required: true,unique: true},
  password: {type: String, required: true},
  phone: {type: String, default: ""},
  avatar: {type: String, default: ""},
  address: {
    firstName: {type: String, default: ""},
    lastName: {type: String, default: ""},
    email: {type: String, default: ""},
    phone: {type: String, default: ""},
    street: {type: String, default: ""},
    city: {type: String, default: ""},
    state: {type: String, default: ""},
    zipcode: {type: String, default: ""},
    country: {type: String, default: "India"}
  },
  cartData: {type: Object, default: {}},
},{minimize: false, timestamps: true});

const UserModel = mongoose.models.user || mongoose.model('user', userSchema);
export default UserModel;
