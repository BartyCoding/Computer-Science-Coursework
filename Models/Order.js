const mongoose = require("mongoose")

const orderSchema = new mongoose.Schema({
    userId: {
        type: ObjectId,
        required: true
    },
    productIds: {
        type: [ObjectId],
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    total: {
        type: Number,
        min: 0
    },
    address: {
        type: String,
        required: true
    },
    transactionId: {
        type: String,
        required: true
    },
    status: {
        type: Number,
        min: 1,
        max: 3
    }
})

module.exports = mongoose.model("Order", orderSchema)