const { MongoClient } = require('mongodb');

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mini-wallet';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    
    const trails = await db.collection('transactiontrail').find().sort({_id: -1}).limit(1).toArray();
    console.log("LAST TRAIL:", JSON.stringify(trails, null, 2));

    if (trails.length > 0) {
      const service = await db.collection('service').findOne({ _id: trails[0].serviceId });
      console.log("SERVICE:", JSON.stringify(service, null, 2));

      const transDef = await db.collection('transdefinition').findOne({ service: trails[0].serviceId });
      console.log("TRANSDEF:", JSON.stringify(transDef, null, 2));

      const entries = await db.collection('pocketentry').find({ transRefId: trails[0].transRefId }).toArray();
      console.log("ENTRIES:", JSON.stringify(entries, null, 2));
    }
  } finally {
    await client.close();
  }
}

run().catch(console.error);
