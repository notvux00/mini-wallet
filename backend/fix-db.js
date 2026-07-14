const { MongoClient } = require('mongodb');
async function run() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('mini-wallet');
  
  // Find P2P Service
  const p2pService = await db.collection('service').findOne({ code: 'P2P_TRANSFER' });
  if (p2pService) {
    // Find its TransDefinition
    const def = await db.collection('transdefinition').findOne({ service: p2pService._id.toString() });
    if (def) {
      if (def.glSteps && def.glSteps.length > 0) {
        def.glSteps[0].amount = 'AMOUNT';
        await db.collection('transdefinition').updateOne(
          { _id: def._id },
          { $set: { glSteps: def.glSteps } }
        );
        console.log('Fixed glSteps[0].amount to AMOUNT for P2P');
      }
    }
  }
  
  await client.close();
}
run().catch(console.error);
