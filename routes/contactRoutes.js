const express = require("express");
const { submitContactForm, getAllContacts, deleteContact } = require("../controllers/contactsController.js");

const router = express.Router();

// Route to handle form submission
router.post("/contact", submitContactForm);

// Route to fetch all messages (for admin)
router.get("/contacts", getAllContacts);

// Route to delete a message
router.delete("/contact/:id", deleteContact);

module.exports = router;
