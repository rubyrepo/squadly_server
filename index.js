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

    // Create announcement
    app.post('/announcements', async (req, res) => {
      try {
        const announcement = req.body;
        const result = await announcementsCollection.insertOne(announcement);
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // Get all announcements
    app.get('/announcements', async (req, res) => {
      try {
        const announcements = await announcementsCollection.find({}).toArray();
        res.json(announcements);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // Update announcement
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

    // Delete announcement
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

    // Test endpoint
    app.get('/', (req, res) => {
      res.send('Squadly server is running!');
    });

  } finally {
    // Don't close the client here as it needs to stay connected for the API
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});