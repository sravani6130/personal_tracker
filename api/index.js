require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Serverless MongoDB Connection
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined in Environment Variables");
    }
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
};

// Ensure DB is connected before handling any API requests
app.use('/api', async (req, res, next) => {
  await connectDB();
  next();
});

// Task Schema
const taskSchema = new mongoose.Schema({
  id: String,
  category: String,
  description: String,
  createdAt: Number,
  endDate: String,
  completed: Boolean
});

const Task = mongoose.model('Task', taskSchema);

// API Routes
// We use a router to handle potential path rewriting issues on Vercel
const apiRouter = express.Router();

apiRouter.get('/tasks', async (req, res) => {
  try {
    const tasks = await Task.find();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tasks', details: err.message });
  }
});

apiRouter.post('/tasks', async (req, res) => {
  try {
    const newTask = new Task(req.body);
    await newTask.save();
    res.status(201).json(newTask);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create task', details: err.message });
  }
});

apiRouter.put('/tasks/:id', async (req, res) => {
  try {
    const updatedTask = await Task.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true }
    );
    res.json(updatedTask);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task', details: err.message });
  }
});

apiRouter.delete('/tasks/:id', async (req, res) => {
  try {
    await Task.findOneAndDelete({ id: req.params.id });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task', details: err.message });
  }
});

// Mount the router on multiple possible Vercel paths just to be safe
app.use('/api', apiRouter);
app.use('/api/index.js', apiRouter);
app.use('/', apiRouter);

// Fallback to index.html for React Router (if needed)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, async () => {
    await connectDB();
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
