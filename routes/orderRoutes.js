// backend/routes/orderRoutes.js

const express = require('express');
const router = express.Router();
const { createOrder,getOrderById,deleteOrderById,getAllOrders,updateOrderStatus,getOrdersByPhone } = require('../controller/orderController');

router.post('/orders', createOrder); 
router.get('/orders/:id', getOrderById);
router.delete('/orders/:id', deleteOrderById); 
router.get('/orders', getAllOrders); // ✅ ADD THIS
router.put('/:id/status', updateOrderStatus);
router.get('/orders/by-phone/:phone', getOrdersByPhone);



module.exports = router;
