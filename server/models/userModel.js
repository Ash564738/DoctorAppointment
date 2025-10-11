const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const schema = mongoose.Schema(
  {
    firstname: {
      type: String,
      required: [true, 'First name is required'],
      minLength: [3, 'First name must be at least 3 characters'],
      maxLength: [50, 'First name cannot exceed 50 characters'],
      trim: true,
      validate: {
        validator: function(v) {
          return /^[a-zA-Z\s]+$/.test(v);
        },
        message: 'First name can only contain letters and spaces'
      }
    },
    lastname: {
      type: String,
      required: [true, 'Last name is required'],
      minLength: [3, 'Last name must be at least 3 characters'],
      maxLength: [50, 'Last name cannot exceed 50 characters'],
      trim: true,
      validate: {
        validator: function(v) {
          return /^[a-zA-Z\s]+$/.test(v);
        },
        message: 'Last name can only contain letters and spaces'
      }
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      validate: {
        validator: function(v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Please provide a valid email address'
      }
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: {
        values: ["Admin", "Doctor", "Patient"],
        message: 'Role must be Admin, Doctor, or Patient'
      },
      index: true
    },
    isAdmin: {
      type: Boolean,
      default: function() {
        return this.role === "Admin";
      }
    },
    age: {
      type: Number,
      min: [1, 'Age must be at least 1'],
      max: [120, 'Age must be less than 120']
    },
    dateOfBirth: {
      type: Date,
      validate: {
        validator: function(v) {
          return !v || v <= new Date();
        },
        message: 'Date of birth cannot be in the future'
      }
    },
    bloodGroup: {
      type: String,
      enum: {
        values: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'A', 'B', 'AB', 'O'],
        message: 'Invalid blood group'
      }
    },
    familyDiseases: {
      type: String,
      maxlength: [500, 'Family diseases description too long']
    },
    gender: {
      type: String,
      enum: {
        values: ["male", "female", "other"],
        message: 'Gender must be male, female, or other'
      }
    },
    mobile: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^\+?[\d\s\-\(\)]+$/.test(v);
        },
        message: 'Invalid phone number format'
      }
    },
    address: {
      type: String,
      maxLength: [200, 'Address cannot exceed 200 characters'],
      trim: true
    },
    status: {
      type: String,
      enum: {
        values: ["Active", "Inactive", "Suspended", "Pending"],
        message: 'Invalid status'
      },
      default: "Active",
      index: true
    },
    pic: {
      type: String,
      default: "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
      validate: {
        validator: function(v) {
          return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
        },
        message: 'Profile picture must be a valid image URL'
      }
    },
    lastLogin: {
      type: Date
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationToken: {
      type: String,
      select: false
    },
    passwordResetToken: {
      type: String,
      select: false
    },
    passwordResetExpires: {
      type: Date,
      select: false
    }
  },
  {
    timestamps: true,
  }
);

schema.index({ role: 1, status: 1 });
schema.index({ email: 1, role: 1 });
schema.virtual('fullName').get(function() {
  return `${this.firstname} ${this.lastname}`;
});
schema.virtual('calculatedAge').get(function() {
  if (!this.dateOfBirth) return this.age || null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

schema.pre('save', async function(next) {
  try {
    if (this.isModified('password')) {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    }
    if (this.isModified('role')) {
      this.isAdmin = this.role === 'Admin';
    }
    if (this.dateOfBirth) {
      const today = new Date();
      const birthDate = new Date(this.dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      this.age = age;
    }
    next();
  } catch (error) {
    next(error);
  }
});
schema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};
schema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save({ validateBeforeSave: false });
};

const User = mongoose.model("User", schema);
module.exports = User;