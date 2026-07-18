// Database migration script to add proper unique index on googleId
const { MongoClient } = require('mongodb');
// Environment variables loaded by Next.js from .env.local

async function createUniqueGoogleIdIndex() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || 'stadium_ops');
    const collection = db.collection('users');

    console.log('Checking existing indexes...');
    const indexes = await collection.listIndexes().toArray();
    console.log('Existing indexes:', JSON.stringify(indexes, null, 2));

    // Check if we have a proper unique index on googleId
    const googleIdIndex = indexes.find(index => index.key?.googleId === 1);

    if (googleIdIndex?.unique) {
      if (googleIdIndex.sparse) {
        console.log('✅ Found existing unique sparse index on googleId - this is correct!');
        return;
      } else {
        console.log('❌ Found existing unique NON-sparse index on googleId - this will cause conflicts with null values');
        console.log('Removing old index and creating new sparse one...');
        await collection.dropIndex('googleId_1');
      }
    } else {
      console.log('⚠️  No unique index found on googleId - will create one');
    }

    console.log('Creating unique sparse index on googleId...');
    await collection.createIndex(
      { googleId: 1 },
      {
        unique: true,
        sparse: true,
        name: 'googleId_1_unique_sparse'
      }
    );

    console.log('✅ Successfully created unique sparse index on googleId');
    console.log('\nThis index will:')
    console.log('- Allow multiple documents with googleId: null (for regular users)');
    console.log('- Enforce uniqueness for non-null googleId values (for Google users)');
    console.log('- Be efficient by only indexing documents that have googleId values');

    console.log('\nTo test: try creating another user via /api/auth/register');

  } catch (error) {
    console.error('❌ Error creating unique sparse index:', error);
    throw error;
  } finally {
    await client.close();
  }
}

createUniqueGoogleIdIndex().catch(console.error);