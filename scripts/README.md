# Scripts Directory

This directory contains utility and maintenance scripts for the Doctor Appointment System.

## Setup Scripts (`/setup`)

These scripts are used for initial system setup and database initialization:

### createAdmin.js
Creates the initial admin user for the system.
```bash
cd scripts/setup
node createAdmin.js
```

### createSampleUsers.js
Creates sample doctors and patients for development/testing.
```bash
cd scripts/setup
node createSampleUsers.js
```

### resetAdmin.js
Resets the admin user credentials to default values.
```bash
cd scripts/setup
node resetAdmin.js
```

### seedUsers.js
Seeds the database with initial user data.
```bash
cd scripts/setup
node seedUsers.js
```

### updatePasswords.js
Updates all user passwords to known values (useful for development).
```bash
cd scripts/setup
node updatePasswords.js
```

## Maintenance Scripts (`/maintenance`)

These scripts are used for system maintenance and monitoring:

### healthcheck.js
Performs health checks on the system components.
```bash
cd scripts/maintenance
node healthcheck.js
```

## Usage Notes

1. **Environment**: These scripts require the same environment variables as the main server
2. **Database**: Ensure MongoDB is running before executing any scripts
3. **Dependencies**: Run these scripts from their respective directories
4. **Order**: For initial setup, run scripts in this order:
   - createAdmin.js
   - createSampleUsers.js (optional for development)
   - seedUsers.js (if needed)

## Security Warning

⚠️ **Important**: The setup scripts create users with default passwords. Always change these passwords in production environments.

## Script Dependencies

All scripts require:
- Node.js environment
- Access to MongoDB database
- Proper environment variables set
- Server dependencies installed (`npm install` in server directory)
