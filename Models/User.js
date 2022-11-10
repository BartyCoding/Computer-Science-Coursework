const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
    permLvl: {
        type: Number,
        required: true,
        min: 1,
        max: 3
    },
    email: {
        type: String,
        required: true,
        match: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/
    },
    password: {
        type: String,
        required: true,
        minLength: 6
    },
    name: {
        type: String,
        maxLength: 20
    },
    phone: {
        type: String
    },
    address: String,
    cart: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "Product"
    },
    orders: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "Order"
    }
})

module.exports = mongoose.model("User", userSchema)