const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.db_username}:${process.env.db_password}@cluster0.by8ms6m.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    
    const db = client.db("squadlyDB");
    const announcementsCollection = db.collection("announcements");
    const usersCollection = db.collection("users");
    const couponsCollection = db.collection("coupons");

    // Announcement Routes
    app.post('/announcements', async (req, res) => {
      try {
        const announcement = req.body;
        const result = await announcementsCollection.insertOne(announcement);
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    app.get('/announcements', async (req, res) => {
      try {
        const announcements = await announcementsCollection.find({}).toArray();
        res.json(announcements);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    app.put('/announcements/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const updatedAnnouncement = req.body;
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const updateDoc = {
          $set: updatedAnnouncement,
        };
        const result = await announcementsCollection.updateOne(filter, updateDoc, options);
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    app.delete('/announcements/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await announcementsCollection.deleteOne(query);
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // User Routes
    app.post('/users', async (req, res) => {
      try {
        const userData = req.body;
        const existingUser = await usersCollection.findOne({ uid: userData.uid });
        if (existingUser) {
          return res.status(400).json({ message: 'User already exists' });
        }
        const result = await usersCollection.insertOne(userData);
        res.status(201).json(result);
      } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
      }
    });

    // Coupon Routes
    app.post('/coupons', async (req, res) => {
      try {
        const { code, discount } = req.body;
        
        if (!code || !discount) {
          return res.status(400).json({ message: 'Code and discount are required' });
        }

        const existingCoupon = await couponsCollection.findOne({ code });
        if (existingCoupon) {
          return res.status(400).json({ message: 'Coupon code already exists' });
        }

        const result = await couponsCollection.insertOne({
          code,
          discount: Number(discount),
          createdAt: new Date()
        });

        res.status(201).json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    app.get('/coupons', async (req, res) => {
      try {
        const coupons = await couponsCollection.find({}).toArray();
        res.json(coupons);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    app.put('/coupons/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const { code, discount } = req.body;

        if (!code || !discount) {
          return res.status(400).json({ message: 'Code and discount are required' });
        }

        const existingCoupon = await couponsCollection.findOne({
          code,
          _id: { $ne: new ObjectId(id) }
        });
        
        if (existingCoupon) {
          return res.status(400).json({ message: 'Coupon code already exists' });
        }

        const result = await couponsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              code,
              discount: Number(discount),
              updatedAt: new Date()
            }
          }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Coupon not found' });
        }

        res.json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    app.delete('/coupons/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const result = await couponsCollection.deleteOne({
          _id: new ObjectId(id)
        });

        if (result.deletedCount === 0) {
          return res.status(404).json({ message: 'Coupon not found' });
        }

        res.json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // Test endpoint
    app.get('/', (req, res) => {
      res.send('Squadly server is running!');
    });

  } finally {
    // Keep connection alive
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});