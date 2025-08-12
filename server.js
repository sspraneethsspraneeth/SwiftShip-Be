const express = require('express');
const http = require('http');           
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();


const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));
app.use(cors());

// ✅ Import routes FIRST
const authRoutes = require('./routes/auth');
const verificationRoutes = require('./routes/verification');
const paymentRoutes = require('./routes/paymentRoutes');
const staffRoutes = require("./routes/staff");
const warehouseRoutes = require('./routes/warehouse');
const warehouseStaffRoutes = require('./routes/warehouseStaffRoutes');
const transactionRoutes = require("./routes/transaction");
const orderRoutes = require('./routes/orderRoutes');
const fleetRoutes = require('./routes/fleet');
const trackingRoutes = require("./routes/trackingRoutes");
const shipmentRoutes = require('./routes/shipmentRoutes'); 
const deliveryRoutes = require("./routes/delivery");
const scheduleJobs = require("./cron/scheduler");
const roleRoutes = require('./routes/roleRoutes');
const companyInfoRoutes = require('./routes/companyInfoRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const walletRoutes = require('./routes/walletRoutes');


const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',  
  },
});

// Make io accessible to routes/controllers via app.set
app.set('io', io);
app.use('/api', authRoutes);
app.use('/api', verificationRoutes);
app.use("/api/staff", staffRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api', warehouseRoutes);
app.use("/api/warehouse-staff", warehouseStaffRoutes);
app.use("/api/transactions", transactionRoutes);
app.use('/api', orderRoutes);
app.use("/api/fleet", fleetRoutes);
app.use("/api/trackings", trackingRoutes);
app.use('/api/shipment', shipmentRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/company-info', companyInfoRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/wallet', walletRoutes);




// DB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    
  })
  .catch(err => console.error(err));
