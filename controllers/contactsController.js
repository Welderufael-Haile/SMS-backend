const ContactsService = require('../services/contactsService');

const submitContactForm = async (req, res, next) => {
  try {
    await ContactsService.submitContactForm(req.body);
    res.status(201).json({ success: true, message: "Message sent successfully!" });
  } catch (error) {
    next(error);
  }
};

const getAllContacts = async (req, res, next) => {
  try {
    const contacts = await ContactsService.getAllContacts();
    res.status(200).json(contacts);
  } catch (error) {
    next(error);
  }
};

const deleteContact = async (req, res, next) => {
  try {
    await ContactsService.deleteContact(req.params.id);
    res.status(200).json({ success: true, message: "Message deleted successfully." });
  } catch (error) {
    next(error);
  }
};

module.exports = { submitContactForm, getAllContacts, deleteContact };
