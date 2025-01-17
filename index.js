


const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5gtpi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient instance with MongoClientOptions
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Connect to MongoDB and define routes
async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB!");

    const db = client.db("pieceDB");
    const usersCollection = db.collection("users");
    const tasksCollection = db.collection("tasks");

    // Add a user (POST)
    app.post('/users', async (req, res) => {
      const user = req.body;
      if (!user.email || !user.name) {
        return res.status(400).send({ message: "Missing required fields: email and name" });
      }
      try {
        const result = await usersCollection.insertOne(user);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error adding user:", error);
        res.status(500).send({ message: "Failed to add user" });
      }
    });

    // Get all users (GET)
    app.get('/users', async (req, res) => {
      try {
        const users = await usersCollection.find().toArray();
        res.send(users);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send({ message: "Failed to fetch users" });
      }
    });

    // Get a user by email (GET)
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      try {
        const user = await usersCollection.findOne({ email });
        if (user) {
          res.send(user);
        } else {
          res.status(404).send({ message: "User not found" });
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).send({ message: "Failed to fetch user" });
      }
    });

    // Deduct coins from a user (PATCH)
    // Add a task (POST)
app.post('/tasks', async (req, res) => {
  const task = req.body;
  if (!task.task_title || !task.required_workers || !task.payable_amount || !task.completion_date || !task.email) {
    return res.status(400).send({ message: "Missing required fields in task" });
  }

  try {
    const result = await tasksCollection.insertOne(task);
    if (result.insertedId) {
      res.status(201).send({ message: "Task added successfully", taskId: result.insertedId });
    } else {
      res.status(500).send({ message: "Failed to add task" });
    }
  } catch (error) {
    console.error("Error adding task:", error);
    res.status(500).send({ message: "Failed to add task" });
  }
});

// Deduct coins from a user (PATCH)
app.patch('/users/deduct-coins', async (req, res) => {
  const { email, amount } = req.body;
  if (!email || !amount) {
    return res.status(400).send({ message: "Missing required fields: email and amount" });
  }

  try {
    // Check if user has enough coins before deducting
    const user = await usersCollection.findOne({ email });
    if (!user || user.coins < amount) {
      return res.status(400).send({ message: "Insufficient coins" });
    }

    // Deduct coins
    const result = await usersCollection.updateOne(
      { email },
      { $inc: { coins: -amount } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "User not found" });
    }

    // Fetch updated user data after deducting coins
    const updatedUser = await usersCollection.findOne({ email });
    res.send(updatedUser); // Return the updated user
  } catch (error) {
    console.error("Error deducting coins:", error);
    res.status(500).send({ message: "Failed to deduct coins" });
  }
});

    // Get all tasks (GET)
    app.get('/tasks', async (req, res) => {
      try {
        const tasks = await tasksCollection.find().toArray();
        res.send(tasks);
      } catch (error) {
        console.error("Error fetching tasks:", error);
        res.status(500).send({ message: "Failed to fetch tasks" });
      }
    });

    // Get a task by ID (GET)
    app.get('/tasks/:id', async (req, res) => {
      const id = req.params.id;
      try {
        const task = await tasksCollection.findOne({ _id: new ObjectId(id) });
        if (task) {
          res.send(task);
        } else {
          res.status(404).send({ message: "Task not found" });
        }
      } catch (error) {
        console.error("Error fetching task:", error);
        res.status(500).send({ message: "Failed to fetch task" });
      }
    });

  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1); // Exit if there's an issue with the MongoDB connection
  }
}

// Start MongoDB connection
run().catch(console.dir);

// Root route
app.get('/', (req, res) => {
  res.send('Piece work is running');
});

// Start server
app.listen(port, () => {
  console.log(`Piece work is running on port ${port}`);
});
