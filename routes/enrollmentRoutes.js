// const express = require("express");
// const router = express.Router();
// const enrollmentController = require("../controllers/enrollmentController");

// // CRUD
// router.get("/", enrollmentController.getAllEnrollments);
// router.post("/", enrollmentController.createEnrollment);
// router.put("/:id", enrollmentController.updateEnrollment);
// router.delete("/:id", enrollmentController.deleteEnrollment);

// // Dropdown values
// router.get("/dropdowns", enrollmentController.getDropdowns);

// // Filter + Search
// router.get("/filter", enrollmentController.filterEnrollments);

// // Export to Excel
// router.get("/export", enrollmentController.exportEnrollmentsToExcel);

// module.exports = router;

const express = require('express');
const router = express.Router();

const {getAllEnrollments, getDropdowns,createEnrollment,updateEnrollment,deleteEnrollment,exportToExcel
} = require('../controllers/enrollmentController');

// Define the routes
router.get('/', getAllEnrollments);
router.get('/dropdowns', getDropdowns);
router.post('/', createEnrollment);
router.put('/:id', updateEnrollment);
router.delete('/:id', deleteEnrollment);
router.get('/export', exportToExcel); // <-- Make sure this exists

module.exports = router;
