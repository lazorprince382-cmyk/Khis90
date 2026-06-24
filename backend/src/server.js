const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
require('dotenv').config();

const learnerRoutes = require('./routes/learners');
const notificationRoutes = require('./routes/notifications');
const createScanRoutes = require('./routes/scan');
const authRoutes = require('./routes/auth');
const settingsRoutes = require('./routes/settings');
const cardRoutes = require('./routes/cards');
const createStaffRoutes = require('./routes/staff');
const visitorRoutes = require('./routes/visitors');
const reportRoutes = require('./routes/reports');
const officeRoutes = require('./routes/offices');
const createMessageRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');
const { authenticate } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', school: 'Kabojja International School', motto: 'We strive to achieve' });
});

app.use('/api/auth', authRoutes);
app.use('/api/learners', learnerRoutes);
app.use('/api/scan', createScanRoutes(io));
app.use('/api/notifications', authenticate, notificationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/staff', createStaffRoutes(io));
app.use('/api/visitors', visitorRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/offices', officeRoutes);
app.use('/api/messages', createMessageRoutes(io));
app.use('/api/admin', adminRoutes);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

server.listen(PORT, () => {
  console.log(`KIS Server running on port ${PORT}`);
  console.log('Kabojja International School - We strive to achieve');
});
