// const express = require('express');
// const app = express();
// const cors = require('cors');
// require('dotenv').config()
// const port = process.env.PORT || 5000;

// // Middleware

// app.use(cors());
// app.use(express());


// const { MongoClient, ServerApiVersion } = require('mongodb');
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5gtpi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// // Create a MongoClient with a MongoClientOptions object to set the Stable API version
// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   }
// });

// async function run() {
//   try {
//     // Connect the client to the server	(optional starting in v4.7)
//     await client.connect();
//     // Send a ping to confirm a successful connection
//     await client.db("admin").command({ ping: 1 });
//     console.log("Pinged your deployment. You successfully connected to MongoDB!");
//   } finally {
//     // Ensures that the client will close when you finish/error
//     await client.close();
//   }
// }
// run().catch(console.dir);



// app.get('/', (req, res) => {
//     res.send('piece work running')
// })

// app.listen(port, () => {
//     console.log(`piece work is running on port ${port}`)
// } )

// const express = require('express');
// const app = express();
// const cors = require('cors');
// require('dotenv').config();
// const port = process.env.PORT || 5000;

// // Middleware
// app.use(cors());
// app.use(express.json()); // Use `express.json()` for parsing JSON requests

// const { MongoClient, ServerApiVersion } = require('mongodb');
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5gtpi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// // Create a MongoClient with a MongoClientOptions object to set the Stable API version
// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   },
// });

// async function run() {
//   try {
//     // Connect the client to the server (optional starting in v4.7)
//     await client.connect();
//     console.log("Pinged your deployment. You successfully connected to MongoDB!");

//     // Define database and collections
//     const db = client.db("pieceDB");
//     const usersCollection = db.collection("users");

//     // Add a user (POST)
//     app.post('/users', async (req, res) => {
//       const user = req.body;
//       try {
//         const result = await usersCollection.insertOne(user);
//         res.send(result);
//       } catch (error) {
//         console.error("Error adding user:", error);
//         res.status(500).send({ message: "Failed to add user" });
//       }
//     });

//     // Get all users (GET)
//     app.get('/users', async (req, res) => {
//       try {
//         const users = await usersCollection.find().toArray();
//         res.send(users);
//       } catch (error) {
//         console.error("Error fetching users:", error);
//         res.status(500).send({ message: "Failed to fetch users" });
//       }
//     });

//     // Get a user by email (GET)
//     app.get('/users/:email', async (req, res) => {
//       const email = req.params.email;
//       try {
//         const user = await usersCollection.findOne({ email });
//         if (user) {
//           res.send(user);
//         } else {
//           res.status(404).send({ message: "User not found" });
//         }
//       } catch (error) {
//         console.error("Error fetching user:", error);
//         res.status(500).send({ message: "Failed to fetch user" });
//       }
//     });

//   } catch (error) {
//     console.error("Error connecting to MongoDB:", error);
//   }
// }

// run().catch(console.dir);

// app.get('/', (req, res) => {
//   res.send('Piece work is running');
// });

// app.listen(port, () => {
//   console.log(`Piece work is running on port ${port}`);
// });
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
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
