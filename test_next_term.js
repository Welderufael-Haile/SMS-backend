const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:5000/api/enrollments/next-term', {
      academic_year_id: 1, // Will update these to valid ones after I find out
      current_term_id: 1,
      next_term_id: 2,
      next_academic_year_id: 1
    });
    console.log("Success:", res.data);
  } catch (err) {
    console.error("Error Status:", err.response?.status);
    console.error("Error Data:", err.response?.data);
  }
}
test();
