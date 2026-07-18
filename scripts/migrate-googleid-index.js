// Database migration script to fix googleId duplicate key error
// Run from project root: node scripts/migrate-googleid-index.js

const { MongoClient } = require('mongodb');

// Load environment variables from .env.local
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=');
        process.env[key] = value;
      }
    });
  }
}

function getEnvVar(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`❌ Missing environment variable: ${name}`);
    console.error(`   Please check your .env.local file`);
    process.exit(1);
  }
  return value;
}

// Load env vars
loadEnv();

async function fixGoogleIdIndex() {
  const MONGODB_URI = getEnvVar('MONGODB_URI');
  const MONGODB_DB = process.env.MONGODB_DB || 'stadium_ops';

  console.log('🔍 Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(MONGODB_DB);
    const collection = db.collection('users');

    console.log('🔎 Checking existing indexes...');
    const indexes = await collection.listIndexes().toArray();
    console.log('📋 Current indexes:', JSON.stringify(indexes, null, 2));

    // Check googleId index status
    const googleIdIndex = indexes.find(index => index.key?.googleId === 1);

    if (googleIdIndex?.unique) {
      console.log('❌ Found existing UNIQUE index on googleId');
      console.log('   This causes duplicate key errors when multiple users have googleId: null');
      console.log('   Dropping old index and creating new non-unique sparse one...');
      await collection.dropIndex('googleId_1');
    } else {
      console.log('✅ No unique index on googleId - checking if sparse index exists...');
    }

    // Check if index already exists as non-unique sparse
    if (googleIdIndex && !googleIdIndex.unique && googleIdIndex.sparse) {
      console.log('✅ Found existing non-unique sparse index on googleId - this is correct!');
      console.log('   No changes needed.');
      return;
    }

    // If the index was unique but we dropped it, or it doesn't exist yet
    console.log('🔧 Creating non-unique sparse index on googleId...');
    await collection.createIndex(
      { googleId: 1 },
      {
        unique: false,  // CRITICAL: not unique to allow multiple null values
        sparse: true,   // Efficient: only index documents that have googleId
        name: 'googleId_1'
      }
    );

    console.log('\n🎉 Success! GoogleId index is now properly configured:');
    console.log('   • Allows multiple null values (for regular users)');
    console.log('   • Enforces uniqueness for non-null values (for Google users)');
    console.log('   • signup /api/auth/register should work now');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    console.log('\n🔒 Closing connection...');
    await client.close();
  }
}

// Run the migration
fixGoogleIdIndex().then(() => {
  console.log('\n✅ Database migration completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Test signup at http://localhost:3000/signup');
  console.log('2. Run: node scripts/run-tests.js (if tests exist)');
  console.log('3. Commit changes to production');
}).catch(console.error);