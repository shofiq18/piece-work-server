
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());





// MongoDB Connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5gtpi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // await client.connect();
    // console.log("Connected to MongoDB!");

    // Database and collections
    const db = client.db("pieceDB");
    const usersCollection = db.collection("users");
    const tasksCollection = db.collection("tasks");
    const submissionsCollection = db.collection("submissions");
    const paymentsCollection = db.collection("payments")
    const withdrawalsCollection = db.collection("withdrawals")

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
          return res.status(200).send(existingUser); 
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


//Home page  best workers get apis 

    app.get("/top-workers", async (req, res) => {
      try {
        // Fetch top 6 workers with maximum coins
        const topWorkers = await usersCollection
          .find({}, { projection: { name: 1, photo: 1, coins: 1 } })
          .sort({ coins: -1 }) 
          .limit(6) 
          .toArray();
    
        res.send(topWorkers);
      } catch (error) {
        console.error("Error fetching top workers:", error);
        res.status(500).send({ error: "Failed to fetch top workers." });
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
        res.send(updatedUser); 
      } catch (error) {
        console.error("Error deducting coins:", error);
        res.status(500).send({ message: "Failed to deduct coins" });
      }
    });






    app.post("/withdrawals", async (req, res) => {
      const {
        worker_email,
        worker_name,
        withdrawal_coin,
        withdrawal_amount,
        payment_system,
        account_number,
        withdraw_date,
      } = req.body;

      try {
        const user = await usersCollection.findOne({ email: worker_email });

        if (!user) {
          return res.status(404).send({ message: "User not found." });
        }

        if (user.coins < withdrawal_coin) {
          return res
            .status(400)
            .send({ message: "Insufficient coins for withdrawal." });
        }

        // Save withdrawal request with 'pending' status
        const withdrawalRequest = {
          worker_email,
          worker_name,
          withdrawal_coin,
          withdrawal_amount,
          payment_system,
          account_number,
          withdraw_date,
          status: "pending", // Status will be updated when admin approves
        };

        await withdrawalsCollection.insertOne(withdrawalRequest);

        res.send({
          message: "Withdrawal request submitted successfully.",
        });
      } catch (error) {
        console.error("Error submitting withdrawal request:", error);
        res.status(500).send({ message: "Failed to submit withdrawal request." });
      }
    });





    app.post("/withdrawals/approve", async (req, res) => {
      const { withdrawalId, worker_email, withdrawal_coin } = req.body;

      try {
        const user = await usersCollection.findOne({ email: worker_email });

        if (!user) {
          return res.status(404).send({ message: "User not found." });
        }

        if (user.coins < withdrawal_coin) {
          return res
            .status(400)
            .send({ message: "Insufficient coins for approval." });
        }

        // Deduct coins from user balance
        await usersCollection.updateOne(
          { email: worker_email },
          { $inc: { coins: -withdrawal_coin } }
        );

        // Update withdrawal request status to 'approved'
        await withdrawalsCollection.updateOne(
          { _id: new ObjectId(withdrawalId) },
          { $set: { status: "approved" } }
        );

        res.send({ message: "Withdrawal approved successfully." });
      } catch (error) {
        console.error("Error approving withdrawal:", error);
        res.status(500).send({ message: "Failed to approve withdrawal." });
      }
    });



    app.get("/withdrawals/pending", async (req, res) => {
      try {
        const pendingWithdrawals = await withdrawalsCollection
          .find({ status: "pending" })
          .toArray();

        res.send(pendingWithdrawals);
      } catch (error) {
        console.error("Error fetching pending withdrawals:", error);
        res.status(500).send({ message: "Failed to fetch pending withdrawals." });
      }
    });








    // admin manage user apis

    app.delete('/users/:id', async (req, res) => {
      const userId = req.params.id;
      try {
        const result = await usersCollection.deleteOne({ _id: new ObjectId(userId) });
        if (result.deletedCount > 0) {
          res.send({ message: "User deleted successfully" });
        } else {
          res.status(404).send({ message: "User not found" });
        }
      } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).send({ message: "Failed to delete user" });
      }
    });


    app.patch("/users/:id", async (req, res) => {
      const { id } = req.params;
      const { role, coins } = req.body;

      try {
        const updateData = { role };
        if (coins !== undefined) {
          updateData.coins = coins; 
        }

        const result = await usersCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        res.status(200).send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to update user" });
      }
    });

    // admin home stats

    app.get('/admin-stats', async (req, res) => {
      try {
        const totalWorkers = await usersCollection.countDocuments({ role: "Worker" });
        const totalBuyers = await usersCollection.countDocuments({ role: "Buyer" });
        const totalAvailableCoins = await usersCollection.aggregate([
          { $group: { _id: null, totalCoins: { $sum: "$coins" } } },
        ]).toArray();

        const totalPayments = await tasksCollection.aggregate([
          { $group: { _id: null, totalPayments: { $sum: "$payable_amount" } } },
        ]).toArray();

        res.send({
          totalWorkers,
          totalBuyers,
          totalAvailableCoins: totalAvailableCoins[0]?.totalCoins || 0,
          totalPayments: totalPayments[0]?.totalPayments || 0,
        });
      } catch (error) {
        console.error("Error fetching admin stats:", error);
        res.status(500).send({ message: "Failed to fetch admin stats" });
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

    app.get('/tasks/user/:email', async (req, res) => {
      const email = req.params.email;
      try {
        const tasks = await tasksCollection
          .find({ email })
          .sort({ completion_date: -1 })
          .toArray();
        res.send(tasks);
      } catch (error) {
        console.error("Error fetching user's tasks:", error);
        res.status(500).send({ message: "Failed to fetch tasks" });
      }
    });

    app.patch('/tasks/:id', async (req, res) => {
      const taskId = req.params.id;
      const { task_title, task_detail, submission_info } = req.body;

      try {
        const result = await tasksCollection.updateOne(
          { _id: new ObjectId(taskId) },
          { $set: { task_title, task_detail, submission_info } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Task not found" });
        }

        res.send({ message: "Task updated successfully" });
      } catch (error) {
        console.error("Error updating task:", error);
        res.status(500).send({ message: "Failed to update task" });
      }
    });




    app.delete('/tasks/:id', async (req, res) => {
      const taskId = req.params.id;
      try {
        const task = await tasksCollection.findOne({ _id: new ObjectId(taskId) });

        if (!task) {
          return res.status(404).send({ message: "Task not found" });
        }

        if (task.required_workers > 0) {
          const refillAmount = task.required_workers * task.payable_amount;
          await usersCollection.updateOne(
            { email: task.email },
            { $inc: { coins: refillAmount } }
          );
        }

        const result = await tasksCollection.deleteOne({ _id: new ObjectId(taskId) });

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Failed to delete task" });
        }

        res.send({ message: "Task deleted successfully" });
      } catch (error) {
        console.error("Error deleting task:", error);
        res.status(500).send({ message: "Failed to delete task" });
      }
    });








    // Buyer Home API

    // Get total task count, pending tasks, and total payment paid by the buyer (GET)
    app.get('/buyer-home/:email', async (req, res) => {
      const email = req.params.email;
      try {
        // Total task count
        const totalTasks = await tasksCollection.countDocuments({ email });

        // Pending tasks count (sum of required_workers)
        const pendingTasks = await tasksCollection.aggregate([
          { $match: { email } },
          { $group: { _id: null, totalPending: { $sum: "$required_workers" } } }
        ]).toArray();

        // Total payment paid by the buyer
        const totalPayment = await tasksCollection.aggregate([
          { $match: { email } },
          { $project: { totalPayment: { $multiply: ["$payable_amount", "$required_workers"] } } },
          { $group: { _id: null, totalPayment: { $sum: "$totalPayment" } } }
        ]).toArray();

        res.send({
          totalTasks,
          pendingTasks: pendingTasks[0]?.totalPending || 0,
          totalPayment: totalPayment[0]?.totalPayment || 0,
        });
      } catch (error) {
        console.error("Error fetching buyer home data:", error);
        res.status(500).send({ message: "Failed to fetch buyer home data" });
      }
    });




    // Get submissions for tasks with "pending" status (GET)
    app.get('/buyer-home/submissions/:email', async (req, res) => {
      const email = req.params.email;

      try {
        // Fetch tasks associated with the buyer
        const tasks = await tasksCollection.find({ email }).toArray();
        const taskIds = tasks.map(task => task._id.toString()); 

        console.log("Task IDs for buyer:", taskIds);

        
        const submissions = await submissionsCollection.find({
          task_id: { $in: taskIds }, 
          status: "pending"
        }).toArray();

        console.log("Fetched submissions:", submissions);

        res.send(submissions);
      } catch (error) {
        console.error("Error fetching submissions for buyer:", error);
        res.status(500).send({ message: "Failed to fetch submissions" });
      }
    });






    app.put('/approve-submission/:submissionId', async (req, res) => {
      const { submissionId } = req.params;
      const { workerEmail, payableAmount } = req.body;
      console.log(`Approving submission: ${submissionId}, worker: ${workerEmail}, amount: ${payableAmount}`);

      try {
        // Fetch the submission to get task_id
        const submission = await submissionsCollection.findOne({ _id: new ObjectId(submissionId) });
        console.log(submission);
        if (!submission) {
          return res.status(404).send({ message: "Submission not found" });
        }

        // Fetch the task associated with the submission
        const task = await tasksCollection.findOne({ _id: new ObjectId(submission.task_id) });
        console.log(task);
        if (!task) {
          return res.status(404).send({ message: "Task not found" });
        }

        // Fetch the buyer associated with the task
        const buyer = await usersCollection.findOne({ email: task.email });
        console.log(buyer);
        if (!buyer) {
          return res.status(404).send({ message: "Buyer not found" });
        }

        // Fetch the worker associated with the submission
        const worker = await usersCollection.findOne({ email: workerEmail });
        console.log(worker);
        if (!worker) {
          return res.status(404).send({ message: "Worker not found" });
        }

        // Check if the buyer has enough coins
        if (buyer.coins < payableAmount) {
          return res.status(400).send({ message: "Not enough coins. Please purchase more coins." });
        }

        // Update buyer's coins (deduct)
        const buyerUpdateResult = await usersCollection.updateOne(
          { email: buyer.email },
          { $inc: { coins: -payableAmount } }
        );
        console.log(buyerUpdateResult);
        if (buyerUpdateResult.modifiedCount === 0) {
          return res.status(500).send({ message: "Failed to deduct coins from buyer." });
        }

        // Update worker's coins (add)
        const workerUpdateResult = await usersCollection.updateOne(
          { email: workerEmail },
          { $inc: { coins: payableAmount } }
        );
        console.log(workerUpdateResult);
        if (workerUpdateResult.modifiedCount === 0) {
          return res.status(500).send({ message: "Failed to add coins to worker." });
        }

        // Update submission status
        const submissionUpdateResult = await submissionsCollection.updateOne(
          { _id: new ObjectId(submissionId) },
          { $set: { status: "approved", buyer_email: buyer.email, buyer_name: buyer.name } }
        );
        console.log(submissionUpdateResult);
        if (submissionUpdateResult.modifiedCount > 0) {
          res.send({
            message: "Submission approved successfully",
            buyer_email: buyer.email,
            buyer_name: buyer.name,
            updatedCoins: buyer.coins - payableAmount,
          });
        } else {
          return res.status(500).send({ message: "Failed to approve submission" });
        }
      } catch (error) {
        console.error("Error approving submission:", error);
        res.status(500).send({ message: "An error occurred while approving the submission" });
      }
    });





    // Reject a submission (PATCH)
    app.patch('/submissions/reject/:id', async (req, res) => {
      const submissionId = req.params.id;
      try {
        // Update submission status to "rejected"
        const result = await submissionsCollection.updateOne(
          { _id: new ObjectId(submissionId) },
          { $set: { status: "rejected" } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Submission not found" });
        }

        // Get the associated task and increase required_workers
        const submission = await submissionsCollection.findOne({ _id: new ObjectId(submissionId) });
        const task = await tasksCollection.findOne({ _id: new ObjectId(submission.task_id) });

        if (task) {
          await tasksCollection.updateOne(
            { _id: new ObjectId(submission.task_id) },
            { $inc: { required_workers: 1 } }
          );
        }

        res.send({ message: "Submission rejected" });
      } catch (error) {
        console.error("Error rejecting submission:", error);
        res.status(500).send({ message: "Failed to reject submission" });
      }
    });











    app.post("/create-payment-intent", async (req, res) => {
      const { amount } = req.body; // Amount is sent from the client in cents

      if (!amount || amount <= 0) {
        return res.status(400).send({ error: "Invalid payment amount" });
      }

      try {
        // Create a payment intent with Stripe
        const paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency: "usd",
          payment_method_types: ["card"],
        });

        res.send({
          clientSecret: paymentIntent.client_secret, 
        });
      } catch (error) {
        console.error("Error creating payment intent:", error);
        res.status(500).send({ error: "Failed to create payment intent" });
      }
    });





    app.post("/save-payment", async (req, res) => {
      const { amount, transactionId, email, coins, timestamp } = req.body;

      try {


        // Save payment info to the payments collection
        const paymentInfo = {
          amount,
          transactionId,
          email,
          coins,
          timestamp,
        };
        await paymentsCollection.insertOne(paymentInfo);

        // Increment the user's coin balance
        const result = await usersCollection.updateOne(
          { email },
          { $inc: { coins } } 
        );

        if (result.modifiedCount > 0) {
          res.status(200).send({ success: true, message: "Coins updated successfully." });
        } else {
          res.status(400).send({ success: false, message: "Failed to update coins." });
        }
      } catch (error) {
        console.error("Error saving payment:", error);
        res.status(500).send({ success: false, message: "Internal server error." });
      }
    });




    app.get("/payment-history/:email", async (req, res) => {
      const { email } = req.params;

      try {
        const payments = await paymentsCollection
          .find({ email })
          .sort({ createdAt: -1 })
          .toArray();

        res.send(payments);
      } catch (error) {
        console.error("Error fetching payment history:", error);
        res.status(500).send({ message: "Failed to fetch payment history" });
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


   

    app.get("/submissions", async (req, res) => {
      try {
        const { page = 1, limit = 10, worker_email } = req.query; 
        const skip = (parseInt(page) - 1) * parseInt(limit);
    
        if (!worker_email) {
          return res.status(400).json({ error: "Worker email is required." });
        }
    
        const totalSubmissions = await submissionsCollection.countDocuments({
          worker_email: worker_email, 
        });
    
        const submissions = await submissionsCollection
          .find({ worker_email: worker_email }) 
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();
    
        res.json({
          submissions,
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalSubmissions / limit),
          totalSubmissions,
        });
      } catch (error) {
        console.error("Error fetching paginated submissions:", error);
        res.status(500).json({ error: "Failed to fetch submissions" });
      }
    });
    
    




    // worker apis


    app.get('/worker-stats/:workerEmail', async (req, res) => {
      const { workerEmail } = req.params;
      try {
        const totalSubmissions = await submissionsCollection.countDocuments({ worker_email: workerEmail });
        const totalPendingSubmissions = await submissionsCollection.countDocuments({
          worker_email: workerEmail,
          status: "pending"
        });
        const totalEarnings = await submissionsCollection.aggregate([
          { $match: { worker_email: workerEmail, status: "approved" } },
          { $group: { _id: null, totalEarnings: { $sum: "$payable_amount" } } },
        ]).toArray();

        res.send({
          totalSubmissions,
          totalPendingSubmissions,
          totalEarnings: totalEarnings[0]?.totalEarnings || 0,
        });
      } catch (error) {
        console.error("Error fetching worker stats:", error);
        res.status(500).send({ message: "Failed to fetch worker stats" });
      }
    });





    // worker home approve submission table api

    app.get('/approved-submissions/:workerEmail', async (req, res) => {
      const { workerEmail } = req.params;
      try {
        const approvedSubmissions = await submissionsCollection
          .find({ worker_email: workerEmail, status: "approved" })
          .toArray();
        res.send(approvedSubmissions);
      } catch (error) {
        console.error("Error fetching approved submissions:", error);
        res.status(500).send({ message: "Failed to fetch approved submissions" });
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
        res.send(updatedSubmission); 
      } catch (error) {
        console.error("Error updating submission:", error);
        res.status(500).send({ message: "Failed to update submission" });
      }
    });

  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1); 
  }
}

// Start MongoDB connection
run().catch(console.dir);

// Root route
app.get('/', (req, res) => {
  res.send('Piece work is running');
});

// Start server end here 
app.listen(port, () => {
  console.log(`Piece work is running on port ${port}`);
});
