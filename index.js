const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MongoDB URI
const uri = `mongodb+srv://${process.env.db_username}:${process.env.db_password}@cluster0.by8ms6m.mongodb.net/?retryWrites=true&w=majority`;

// MongoDB Client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Connect and setup routes
async function run() {
  if (!process.env.db_username || !process.env.db_password) {
    console.error(
      "MongoDB credentials not found in .env file. Please set db_username and db_password."
    );
    return;
  }

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("squadlyDB");
    const announcementsCollection = db.collection("announcements");
    const usersCollection = db.collection("users");
    const couponsCollection = db.collection("coupons");
    const courtsCollection = db.collection("courts");
    const bookingsCollection = db.collection("bookings");

    // ------------------- Announcement Routes -------------------
    app.post("/announcements", async (req, res) => {
      try {
        const announcement = req.body;
        const result = await announcementsCollection.insertOne(announcement);
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    app.get("/announcements", async (req, res) => {
      try {
        const announcements = await announcementsCollection.find({}).toArray();
        res.json(announcements);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    app.put("/announcements/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updatedAnnouncement = req.body;
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const updateDoc = { $set: updatedAnnouncement };
        const result = await announcementsCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    app.delete("/announcements/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await announcementsCollection.deleteOne(query);
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // ------------------- User Routes -------------------
    app.post("/users", async (req, res) => {
      try {
        const userData = req.body;
        const existingUser = await usersCollection.findOne({ uid: userData.uid });
        if (existingUser) {
          return res.status(400).json({ message: "User already exists" });
        }
        const result = await usersCollection.insertOne(userData);
        res.status(201).json(result);
      } catch (error) {
        console.error("Server error:", error);
        res
          .status(500)
          .json({ message: "Internal server error", error: error.message });
      }
    });

    // ------------------- Coupon Routes -------------------
    app.post("/coupons", async (req, res) => {
      try {
        const { code, discount } = req.body;
        if (!code || !discount) {
          return res.status(400).json({ message: "Code and discount are required" });
        }
        const existingCoupon = await couponsCollection.findOne({ code });
        if (existingCoupon) {
          return res.status(400).json({ message: "Coupon code already exists" });
        }
        const result = await couponsCollection.insertOne({
          code,
          discount: Number(discount),
          createdAt: new Date(),
        });
        res.status(201).json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    app.get("/coupons", async (req, res) => {
      try {
        const coupons = await couponsCollection.find({}).toArray();
        res.json(coupons);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    app.put("/coupons/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { code, discount } = req.body;
        if (!code || !discount) {
          return res.status(400).json({ message: "Code and discount are required" });
        }
        const existingCoupon = await couponsCollection.findOne({
          code,
          _id: { $ne: new ObjectId(id) },
        });
        if (existingCoupon) {
          return res.status(400).json({ message: "Coupon code already exists" });
        }
        const result = await couponsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              code,
              discount: Number(discount),
              updatedAt: new Date(),
            },
          }
        );
        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "Coupon not found" });
        }
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    app.delete("/coupons/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const result = await couponsCollection.deleteOne({
          _id: new ObjectId(id),
        });
        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Coupon not found" });
        }
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // ------------------- Court Routes -------------------
    app.get("/courts", async (req, res) => {
      try {
        const courts = await courtsCollection.find({}).toArray();
        res.json(courts);
      } catch (error) {
        console.error("Error fetching courts:", error);
        res.status(500).json({ message: error.message });
      }
    });

    app.post("/courts", async (req, res) => {
      try {
        const { type, timeSlots, pricePerSession, imageUrl } = req.body;
        if (!type || !timeSlots || !pricePerSession || !imageUrl) {
          return res.status(400).json({ message: "All fields are required" });
        }
        const newCourt = {
          type,
          timeSlots,
          pricePerSession: Number(pricePerSession),
          imageUrl,
          createdAt: new Date(),
        };
        const result = await courtsCollection.insertOne(newCourt);
        res.status(201).json(result);
      } catch (error) {
        console.error("Error creating court:", error);
        res.status(500).json({ message: error.message });
      }
    });

    app.put("/courts/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { type, timeSlots, pricePerSession, imageUrl } = req.body;
        if (!type || !timeSlots || !pricePerSession || !imageUrl) {
          return res.status(400).json({ message: "All fields are required" });
        }
        const result = await courtsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              type,
              timeSlots,
              pricePerSession: Number(pricePerSession),
              imageUrl,
              updatedAt: new Date(),
            },
          }
        );
        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "Court not found" });
        }
        res.json(result);
      } catch (error) {
        console.error("Error updating court:", error);
        res.status(500).json({ message: error.message });
      }
    });

    app.delete("/courts/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const result = await courtsCollection.deleteOne({
          _id: new ObjectId(id),
        });
        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Court not found" });
        }
        res.json(result);
      } catch (error) {
        console.error("Error deleting court:", error);
        res.status(500).json({ message: error.message });
      }
    });

    // ------------------- Booking Routes -------------------
    app.post("/bookings", async (req, res) => {
      try {
        const result = await bookingsCollection.insertOne(req.body);
        res.status(201).json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // Get all pending bookings
    app.get('/bookings/pending', async (req, res) => {
      try {
        const pendingBookings = await bookingsCollection
          .find({ status: 'pending' })
          .toArray();
        res.json(pendingBookings);
      } catch (error) {
        console.error('Error fetching pending bookings:', error);
        res.status(500).json({ message: error.message });
      }
    });

    // Approve booking
    app.put('/bookings/:id/approve', async (req, res) => {
      try {
        const bookingId = req.params.id;
        const result = await bookingsCollection.updateOne(
          { _id: new ObjectId(bookingId) },
          {
            $set: {
              status: 'approved',
              approvedAt: new Date()
            }
          }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Booking not found' });
        }

        res.json({ message: 'Booking approved successfully' });
      } catch (error) {
        console.error('Error approving booking:', error);
        res.status(500).json({ message: error.message });
      }
    });

    // Get user's approved bookings
    app.get("/bookings/approved/:email", async (req, res) => {
      try {
        const { email } = req.params;
        const approvedBookings = await bookingsCollection
          .find({ userEmail: email, status: "approved" })
          .toArray();
        res.json(approvedBookings);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // Get user's pending bookings
    app.get("/bookings/pending/:email", async (req, res) => {
      try {
        const { email } = req.params;
        const pendingBookings = await bookingsCollection
          .find({ userEmail: email, status: "pending" })
          .toArray();
        res.json(pendingBookings);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // Cancel booking
    app.delete("/bookings/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const result = await bookingsCollection.deleteOne({
          _id: new ObjectId(id)
        });
        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Booking not found" });
        }
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // ------------------- Test endpoint -------------------
    app.get("/", (req, res) => {
      res.send("Squadly server is running!");
    });
  } finally {
    // Keep connection alive
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
