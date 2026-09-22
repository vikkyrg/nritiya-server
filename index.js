require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const authRoutes = require('./routes/authRoutes');
const galleryRoutes = require('./routes/galleryRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxies (e.g. Render) so generated image URLs use the right protocol.
app.set('trust proxy', 1);

// Middleware
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('Connected to MongoDB successfully.'))
.catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

mongoose.connection.on('error', (err) => console.error('MongoDB runtime error:', err));

// Basic Route
app.get('/', (req, res) => {
    res.send('Nithya Server is running!');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/gallery', galleryRoutes);

// Unknown routes
app.use((req, res) => {
    res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
});

// Central error handler (upload limits, invalid bodies, database errors, ...)
app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);

    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Image must be smaller than 5 MB.' });
    }
    if (err.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid id format.' });
    }
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'Invalid JSON body.' });
    }

    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ message: err.message || 'Server error.' });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
