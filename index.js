
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

    // Database and collections
    const db = client.db("pieceDB");
    const usersCollection = db.collection("users");
    const tasksCollection = db.collection("tasks");
    const submissionsCollection = db.collection("submissions");

    // Add or Get a user (POST)
    app.post('/users', async (req, res) => {
      const user = req.body;
      if (!user.email || !user.name) {
        return res.status(400).send({ message: "Missing required fields: email and name" });
      }

      try {
        // Check if user already exists
        const existingUser = await usersCollection.findOne({ email: user.email });
        if (existingUser) {
          return res.status(200).send(existingUser); // Return existing user
        }

        // Add new user if not found
        const result = await usersCollection.insertOne(user);
        if (result.insertedId) {
          const newUser = await usersCollection.findOne({ _id: result.insertedId });
          res.status(201).send(newUser);
        } else {
          res.status(500).send({ message: "Failed to add user" });
        }
      } catch (error) {
        console.error("Error adding or fetching user:", error);
        res.status(500).send({ message: "Failed to process user" });
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

    // Get all tasks with required_workers > 0 (GET)
    app.get('/tasks/available', async (req, res) => {
      try {
        const tasks = await tasksCollection.find({ required_workers: { $gt: 0 } }).toArray();
        res.send(tasks);
      } catch (error) {
        console.error("Error fetching available tasks:", error);
        res.status(500).send({ message: "Failed to fetch available tasks" });
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



    // Add a submission (POST)
    app.post('/submissions', async (req, res) => {
      const submission = req.body;
      if (!submission.task_id || !submission.worker_email || !submission.submission_details) {
        return res.status(400).send({ message: "Missing required fields in submission" });
      }

      try {
        const result = await submissionsCollection.insertOne(submission);
        if (result.insertedId) {
          res.status(201).send({ message: "Submission added successfully", submissionId: result.insertedId });
        } else {
          res.status(500).send({ message: "Failed to add submission" });
        }
      } catch (error) {
        console.error("Error adding submission:", error);
        res.status(500).send({ message: "Failed to add submission" });
      }
    });
    // Assuming you're using Express.js for the backend
    app.get('/submissions', async (req, res) => {
      try {
        const submissions = await submissionsCollection.find().toArray();
        res.status(200).json(submissions);
      } catch (error) {
        console.error("Error fetching submissions:", error);
        res.status(500).send({ message: "Failed to fetch submissions" });
      }
    });



    // Fetch submissions for a specific worker email
    app.get('/submissions/worker/:email', async (req, res) => {
      const { email } = req.params;
      try {
        const submissions = await submissionsCollection.find({ worker_email: email }).toArray();
        res.send(submissions);
      } catch (error) {
        console.error("Error fetching submissions:", error);
        res.status(500).send({ message: "Failed to fetch submissions" });
      }
    });


    // Get all submissions for a task (GET)
    app.get('/submissions/:taskId', async (req, res) => {
      const taskId = req.params.taskId;
      try {
        const submissions = await submissionsCollection.find({ task_id: new ObjectId(taskId) }).toArray();
        res.send(submissions);
      } catch (error) {
        console.error("Error fetching submissions:", error);
        res.status(500).send({ message: "Failed to fetch submissions" });
      }
    });

    // Update submission status (PATCH)
    app.patch('/submissions/:id', async (req, res) => {
      const submissionId = req.params.id;
      const { status } = req.body;
      if (!status) {
        return res.status(400).send({ message: "Missing required field: status" });
      }

      try {
        const result = await submissionsCollection.updateOne(
          { _id: new ObjectId(submissionId) },
          { $set: { status } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Submission not found" });
        }

        // Fetch updated submission
        const updatedSubmission = await submissionsCollection.findOne({ _id: new ObjectId(submissionId) });
        res.send(updatedSubmission); // Return the updated submission
      } catch (error) {
        console.error("Error updating submission:", error);
        res.status(500).send({ message: "Failed to update submission" });
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
