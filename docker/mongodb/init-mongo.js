// MongoDB Initialization Script
// Creates admin user and application database user
// Run automatically on first container start

// Switch to admin database
db = db.getSiblingDB('admin');

// Create root admin user (if not exists)
if (db.getUser('admin') === null) {
    db.createUser({
        user: 'admin',
        pwd: process.env.MONGO_INITDB_ROOT_PASSWORD || 'change-this-password',
        roles: [
            { role: 'root', db: 'admin' }
        ]
    });
    print('Created admin user');
}

// Switch to application database
db = db.getSiblingDB(process.env.MONGO_INITDB_DATABASE || 'faithflow');

// Create application user with restricted permissions
var appUser = process.env.MONGO_APP_USER || 'faithflow_app';
var appPassword = process.env.MONGO_APP_PASSWORD || 'change-this-password';

if (db.getUser(appUser) === null) {
    db.createUser({
        user: appUser,
        pwd: appPassword,
        roles: [
            { role: 'readWrite', db: process.env.MONGO_INITDB_DATABASE || 'faithflow' }
        ]
    });
    print('Created application user: ' + appUser);
}

print('MongoDB initialization complete');
