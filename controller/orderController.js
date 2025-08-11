const Order = require('../models/Order');
const User = require('../models/User'); // Add if not already imported
const getCoordinates = require('../utils/getCoordinates');
const Notification = require('../models/Notification'); // ✅ Import Notification model




const calculateCost = (weight, deliveryType) => {
  const w = parseFloat(weight);
  if (deliveryType === 'express') {
    if (w <= 1) return 100;
    if (w <= 5) return 250;
    return 400;
  } else {
    if (w <= 1) return 50;
    if (w <= 5) return 150;
    return 250;
  }
};

// Helper: generate next orderId
const generateOrderId = async () => {
  const lastOrder = await Order.findOne().sort({ createdAt: -1 }).exec();
  if (!lastOrder || !lastOrder.orderId) return 'ORD001';

  const lastIdNum = parseInt(lastOrder.orderId.replace('ORD', ''), 10);
  const nextIdNum = lastIdNum + 1;
  return `ORD${String(nextIdNum).padStart(3, '0')}`;
};



exports.createOrder = async (req, res) => {
  try {
    const {
      senderName,
      senderPhone,
      receiverName,
      receiverPhone,
      deliveryAddress,
      packageType,
      weight,
      dimensions,
      deliveryType,
      pickupDate,
      timeSlot,
      notes,
    } = req.body;

    // Find user by sender phone
    const user = await User.findOne({ phone: senderPhone });

    const coordinates = await getCoordinates(deliveryAddress);
    const cost = calculateCost(weight, deliveryType);
    const insurance = 20;
    const gst = 0.18 * cost;
    const totalAmount = cost + insurance + gst;
    const orderId = await generateOrderId();

    const order = new Order({
      orderId,
      senderName,
      senderPhone,
      receiverName,
      receiverPhone,
      deliveryAddress,
      packageType,
      weight,
      dimensions,
      deliveryType,
      pickupDate,
      timeSlot,
      notes,
      cost,
      totalAmount: totalAmount.toFixed(0),
      location: coordinates,
    });

    await order.save();

    // ✅ Store notification in DB with userId
    await Notification.create({
      userId: user ? user._id : null, // if user is found, store their _id
      title: 'New Order Created',
      message: `Order ${order.orderId} has been placed successfully.`,
      type: 'order'
    });

    res.status(201).json({ message: 'Order created successfully', order });

  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};



exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
exports.deleteOrderById = async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);
    if (!deletedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json({ message: 'Order deleted successfully' });
  } catch (err) {
    console.error('Order deletion error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }); // Optional: sort newest first
    res.json({ orders });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
// controllers/orderController.js
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(id, { status }, { new: true });

    if (!order) return res.status(404).json({ message: 'Order not found' });

    res.status(200).json({ message: 'Order status updated', order });
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getOrdersByPhone = async (req, res) => {
  try {
    const { phone } = req.params;

    // 1. Find user by phone
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // 2. Find all orders with senderPhone = phone
    const orders = await Order.find({ senderPhone: phone });

    res.json({
      user: {
        name: user.name,
        phone: user.phone,
        email: user.email,
        address: user.location || 'N/A',
      },
      orders,
    });
  } catch (err) {
    console.error('Error fetching user/orders by phone:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


