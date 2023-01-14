const express = require("express")
const router = express.Router()

const stripe = require('stripe')('sk_test_51Klf4uDwkLbs7UhvgbC57fRb7nIeEBOALxPj2tVqkflB1eh3g9fekCGvOloPBBepqtwmOx7tfOjLpzow0KIin0ck00ePvuSr3S')

const bcrypt = require("bcrypt")
const bodyParser = require("body-parser")
const User = require("../Models/User")
const { catchAsync, ExpressError } = require("../utils/errorhandling")
const { validateUser, isLoggedIn } = require("../utils/middleware")
const Product = require("../Models/Product")
const Order = require("../Models/Order")

const endpointSecret = 'whsec_94e7ebad80bd2cfa831390bc3f4be03bd3c4a95b94c71b894b3a1a2b6f128554';

router.get("/login", (req, res) => {
    res.render("user/login")
})
router.get("/register", (req, res) => {
    res.render("user/register")
})

router.post("/login", catchAsync(async (req, res) => {
    const { user: u } = req.body
    const user = await User.findOne({ email: u.email })
    if (user) {
        if (await bcrypt.compare(u.password, user.password)) {
            req.session.userId = user.id
            req.flash("success", "Successfully logged in!")
            return res.redirect(req.session.previousUrl || "/")
        }
    }
    req.flash("error", "Incorrect email or password")
    res.redirect("/login")
}))

router.post("/register", validateUser, catchAsync(async (req, res) => {
    const { user: u } = req.body
    const user = new User(u)
    await user.save()
    req.session.userId = user.id
    req.flash("success", "Successfully created account!")
    res.redirect(res.redirect(req.session.previousUrl || "/"))
}))

router.get("/logout", (req, res) => {
    req.session.userId = null
    req.flash("success", "Logged out successfully!")
    res.redirect("/")
})

router.get("/order", isLoggedIn, catchAsync(async (req, res) => {
    const line_items = []
    const cart = req.user ? req.user.cart : req.session.cart
    for (let product of cart) {
        const found = await Product.findById(product.productId.toString())
        if (found) {
            line_items.push({
                price_data: {
                    currency: "gbp",
                    product_data: {
                        name: found.name,
                        description: found.description,
                        metadata: { id: found.id }
                    },
                    unit_amount: Math.round(found.discount ? found.discountedPrice * 100 : found.price * 100)
                },
                quantity: product.qty
            })
        }
    }
    const session = await stripe.checkout.sessions.create({
        line_items,
        customer_email: req.user.email,
        mode: 'payment',
        success_url: `http://localhost:3000/`,
        cancel_url: `http://localhost:3000/error`,
        shipping_address_collection: {
            allowed_countries: ["GB"]
        },
        metadata: { userId: req.user.id }
    });

    res.redirect(303, session.url)
}))

router.post("/orderupdate", bodyParser.raw({ type: "application/json" }), catchAsync(async (req, res) => {
    const payload = req.rawBody
    const sig = req.headers['stripe-signature']
    let event

    try {
        event = stripe.webhooks.constructEvent(payload, sig, endpointSecret)
    } catch (e) {
        console.log(e)
        throw new ExpressError("Webhook error!")
    }

    try {
        if (event.type === "checkout.session.completed") {
            const lineItemsSession = await stripe.checkout.sessions.listLineItems(event.data.object.id, {
                expand: ["data.price.product"]
            })
            const customerId = event.data.object.metadata.userId

            const productIds = []
            for (let obj of lineItemsSession.data) {
                let productId = obj.price.product.metadata.id
                let qty = obj.quantity
                const product = await Product.findById(productId)
                product.stock -= qty
                product.save()
                productIds.push({ id: productId, qty })
            }
            const date = new Date(event.created * 1000)
            const total = event.data.object.amount_total / 100
            const name = event.data.object.shipping.name
            const address = event.data.object.shipping.address
            const transactionId = event.data.object.payment_intent

            const newOrder = new Order({ userId: customerId, productIds, date, total, name, address, transactionId })
            await newOrder.save()
        }
    } catch (e) {
        console.log(e)
    }

    res.status(200).end()
}))

module.exports = router