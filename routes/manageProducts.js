const express = require("express")
const router = express.Router()

const Product = require("../Models/Product")
const Category = require("../Models/Category")

router.get("/all", async (req, res) => {
    const products = await Product.find({})
    res.render("manageproducts/all", { products })
})

router.get("/new", async (req, res) => {
    const categories = await Category.find({})
    res.render("manageproducts/new", { categories })
})

router.get("/:id", async (req, res) => {
    const { id } = req.params
    const categories = await Category.find({})
    const product = await Product.findById(id).populate("categories")
    res.render("manageproducts/product", { product, categories })
})

module.exports = router