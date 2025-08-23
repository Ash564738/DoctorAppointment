const mongoose = require("mongoose");

const emergencyContactSchema = mongoose.Schema({
  name: {
    type: String,
    trim: true,
    maxlength: [100, 'Emergency contact name too long']
  },
  relationship: {
    type: String,
    trim: true,
    maxlength: [50, 'Relationship description too long']
  },
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^[\d\s\-\+\(\)]+$/.test(v);
      },
      message: 'Invalid phone number format'
    }
  },
  isPrimary: {
    type: Boolean,
    default: false
  }
});

const familyMemberSchema = mongoose.Schema(
  {
    primaryUserId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: [true, 'Primary user ID is required'],
      index: true
    },
    firstname: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name too long']
    },
    lastname: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name too long']
    },
    relationship: {
      type: String,
      required: [true, 'Relationship is required'],
      enum: [
        'spouse', 'child', 'parent', 'sibling', 'grandparent', 
        'grandchild', 'uncle', 'aunt', 'cousin', 'other'
      ]
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
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say']
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /^[\d\s\-\+\(\)]+$/.test(v);
        },
        message: 'Invalid phone number format'
      }
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v) {
          return !v || /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: 'Invalid email format'
      }
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    medicalHistory: [{
      condition: {
        type: String,
        required: true,
        trim: true
      },
      diagnosedDate: Date,
      status: {
        type: String,
        enum: ['active', 'resolved', 'chronic', 'under_treatment'],
        default: 'active'
      },
      notes: String
    }],
    allergies: [{
      allergen: {
        type: String,
        required: true,
        trim: true
      },
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe', 'life_threatening'],
        default: 'mild'
      },
      reaction: String,
      notes: String
    }],
    medications: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      dosage: String,
      frequency: String,
      startDate: Date,
      endDate: Date,
      prescribedBy: String,
      notes: String
    }],
    emergencyContacts: [emergencyContactSchema],
    insuranceInfo: {
      provider: String,
      policyNumber: String,
      groupNumber: String,
      memberSince: Date,
      expiryDate: Date
    },
    preferences: {
      allowBookingAppointments: {
        type: Boolean,
        default: true
      },
      allowViewingRecords: {
        type: Boolean,
        default: true
      },
      allowEmergencyAccess: {
        type: Boolean,
        default: true
      },
      preferredLanguage: {
        type: String,
        default: 'english'
      },
      communicationPreferences: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: true },
        phone: { type: Boolean, default: false }
      }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    linkedUserId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      index: true // If the family member has their own account
    },
    notes: {
      type: String,
      maxlength: [1000, 'Notes too long']
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for full name
familyMemberSchema.virtual('fullName').get(function() {
  return `${this.firstname} ${this.lastname}`;
});

// Virtual for age calculation
familyMemberSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Virtual for age category
familyMemberSchema.virtual('ageCategory').get(function() {
  const age = this.age;
  if (!age) return null;
  
  if (age < 2) return 'Infant';
  if (age < 13) return 'Child';
  if (age < 20) return 'Teenager';
  if (age < 60) return 'Adult';
  return 'Senior';
});

// Method to check if user can perform action
familyMemberSchema.methods.canPerformAction = function(action) {
  switch (action) {
    case 'book_appointment':
      return this.preferences.allowBookingAppointments && this.isActive;
    case 'view_records':
      return this.preferences.allowViewingRecords && this.isActive;
    case 'emergency_access':
      return this.preferences.allowEmergencyAccess && this.isActive;
    default:
      return false;
  }
};

// Indexes for better performance
familyMemberSchema.index({ primaryUserId: 1, isActive: 1 });
familyMemberSchema.index({ linkedUserId: 1 });
familyMemberSchema.index({ email: 1 }, { sparse: true });
familyMemberSchema.index({ phone: 1 }, { sparse: true });

// Static method to get family members for a user
familyMemberSchema.statics.getFamilyMembersForUser = function(userId, includeInactive = false) {
  const query = { primaryUserId: userId };
  if (!includeInactive) {
    query.isActive = true;
  }
  return this.find(query).sort({ relationship: 1, firstname: 1 });
};

// Static method to search family members
familyMemberSchema.statics.searchFamilyMembers = function(userId, searchTerm) {
  return this.find({
    primaryUserId: userId,
    isActive: true,
    $or: [
      { firstname: { $regex: searchTerm, $options: 'i' } },
      { lastname: { $regex: searchTerm, $options: 'i' } },
      { relationship: { $regex: searchTerm, $options: 'i' } }
    ]
  }).sort({ firstname: 1 });
};

module.exports = mongoose.model("FamilyMember", familyMemberSchema);
