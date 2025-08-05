const express = require('express');
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
const shipmentRoutes = require('./routes/shipmentRoutes'); // ✅ correct path
const deliveryRoutes = require("./routes/delivery");
const scheduleJobs = require("./cron/scheduler");




// ✅ Then use them
app.use('/api', authRoutes);
app.use('/api', verificationRoutes);
app.use("/api/staff", staffRoutes);


// Payment routes

app.use('/api/payment', paymentRoutes);
app.use('/api', warehouseRoutes);
app.use("/api/warehouse-staff", warehouseStaffRoutes);
app.use("/api/transactions", transactionRoutes);
app.use('/api', orderRoutes);
app.use("/api/fleet", fleetRoutes);
app.use("/api/trackings", trackingRoutes);
app.use('/api/shipment', shipmentRoutes);
app.use("/api/deliveries", deliveryRoutes);




// DB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    
  })
  .catch(err => console.error(err));
