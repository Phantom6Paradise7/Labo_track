const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { isLiveMongo, store } = require('./adapter');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your full name'],
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: [true, 'Please provide your institutional email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8
  },
  role: {
    type: String,
    enum: {
      values: ['requester', 'staff', 'student', 'lab_incharge', 'admin', 'supplier'],
      message: '{VALUE} is not an authorized role'
    },
    required: [true, 'User role is strictly required'],
    default: 'requester'
  },
  department: {
    type: String,
    default: 'Research & Labs'
  },
  studentOrStaffId: {
    type: String,
    trim: true
  },
  supplierCompany: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const MongooseUser = mongoose.models.User || mongoose.model('User', userSchema);

class UserProxy {
  static find(query = {}) {
    if (isLiveMongo()) return MongooseUser.find(query);
    return store.memoryUsers;
  }

  static async findOne(query) {
    if (isLiveMongo()) return MongooseUser.findOne(query);
    const email = query.email ? query.email.toLowerCase() : null;
    return store.memoryUsers.find(u => u.email.toLowerCase() === email) || null;
  }

  static async findById(id) {
    if (isLiveMongo()) return MongooseUser.findById(id);
    return store.memoryUsers.find(u => u._id.toString() === id.toString()) || null;
  }

  static async create(doc) {
    if (isLiveMongo()) return MongooseUser.create(doc);
    const salt = bcrypt.genSaltSync(10);
    const hashed = bcrypt.hashSync(doc.password, salt);
    const newUser = {
      _id: 'usr_' + Date.now(),
      ...doc,
      password: hashed,
      comparePassword: async function(candidate) {
        return bcrypt.compare(candidate, this.password);
      }
    };
    store.memoryUsers.push(newUser);
    return newUser;
  }

  static async deleteMany(query) {
    if (isLiveMongo()) return MongooseUser.deleteMany(query);
    store.memoryUsers.length = 0;
    return { deletedCount: 0 };
  }

  constructor(doc) {
    if (isLiveMongo()) {
      return new MongooseUser(doc);
    }
    this.doc = doc;
    this.save = async function() {
      return UserProxy.create(this.doc);
    };
  }
}

module.exports = UserProxy;
