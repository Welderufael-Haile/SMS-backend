const prisma = require('../config/prisma');
const { BadRequestError, NotFoundError } = require('../utils/errors');

class ContactsService {
  static async submitContactForm(data) {
    const { full_name, phone_number, email, message } = data;

    if (!full_name || !phone_number || !email || !message) {
      throw new BadRequestError("All fields are required.");
    }

    return await prisma.contacts.create({
      data: {
        full_name,
        phone_number,
        email,
        message
      }
    });
  }

  static async getAllContacts() {
    return await prisma.contacts.findMany({
      orderBy: { created_at: 'desc' }
    });
  }

  static async deleteContact(id) {
    const contactId = parseInt(id, 10);
    try {
      return await prisma.contacts.delete({
        where: { id: contactId }
      });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundError("Message not found.");
      }
      throw err;
    }
  }
}

module.exports = ContactsService;
