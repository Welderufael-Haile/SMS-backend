const JobPostsService = require('../services/jobPostsService');

exports.getJobPosts = async (req, res, next) => {
  try {
    const posts = await JobPostsService.getJobPosts();
    res.status(200).json(posts);
  } catch (error) {
    next(error);
  }
};

exports.createJobPost = async (req, res, next) => {
  try {
    await JobPostsService.createJobPost(req.body);
    res.status(201).json({ message: "Job post created successfully" });
  } catch (error) {
    next(error);
  }
};

exports.updateJobPost = async (req, res, next) => {
  try {
    await JobPostsService.updateJobPost(req.params.id, req.body);
    res.status(200).json({ message: "Job post updated successfully" });
  } catch (error) {
    next(error);
  }
};

exports.deleteJobPost = async (req, res, next) => {
  try {
    await JobPostsService.deleteJobPost(req.params.id);
    res.status(200).json({ message: "Job post deleted successfully" });
  } catch (error) {
    next(error);
  }
};
