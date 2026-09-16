import exp from 'express'
import { ApplicationModel } from '../models/ApplicationModel.js'
import { JobModel } from '../models/JobModel.js'
import { verifyToken } from '../middlewares/tokenVerificationMiddleware.js'
import { allowedRoles } from '../middlewares/allowedRolesMiddleware.js'

export const applicationRoute = exp.Router()

//------------------- JOB SEEKER -------------------

//Job Seeker: apply to a job
applicationRoute.post(
    '/applications',
    verifyToken,
    allowedRoles('JOBSEEKER'),
    async (req, res) => {
        try {
            let jobId = req.body.job
            //the job must exist
            let job = await JobModel.findById(jobId)
            if (job === null) {
                return res
                    .status(404)
                    .json({ success: false, message: 'Job not found' })
            }
            //a closed job cannot accept new applications
            if (job.status === 'CLOSED') {
                return res.status(400).json({
                    success: false,
                    message: 'This job is closed for applications',
                })
            }
            //the same seeker cannot apply twice to the same job
            let existing = await ApplicationModel.findOne({
                job: jobId,
                applicant: req.user.id,
            })
            if (existing !== null) {
                return res.status(400).json({
                    success: false,
                    message: 'You already applied to this job',
                })
            }
            let newApplication = {
                job: jobId,
                applicant: req.user.id,
                coverLetter: req.body.coverLetter,
            }
            let applicationDocument = await ApplicationModel.create(newApplication)
            res.status(201).json({
                success: true,
                message: 'Application submitted',
                data: applicationDocument,
            })
        } catch (err) {
            res.status(500).json({ success: false, message: err.message })
        }
    }
)

//Job Seeker: view MY applications
applicationRoute.get(
    '/my-applications',
    verifyToken,
    allowedRoles('JOBSEEKER'),
    async (req, res) => {
        try {
            let applications = await ApplicationModel.find({
                applicant: req.user.id,
            }).populate('job', 'title company location salary status')
            res.status(200).json({
                success: true,
                count: applications.length,
                data: applications,
            })
        } catch (err) {
            res.status(500).json({ success: false, message: err.message })
        }
    }
)

//Job Seeker: withdraw MY application
applicationRoute.delete(
    '/applications/:id',
    verifyToken,
    allowedRoles('JOBSEEKER'),
    async (req, res) => {
        try {
            let application = await ApplicationModel.findById(req.params.id)
            if (application === null) {
                return res
                    .status(404)
                    .json({ success: false, message: 'Application not found' })
            }
            //a seeker can withdraw only their own application
            if (application.applicant.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: "You can't withdraw someone else's application",
                })
            }
            await ApplicationModel.findByIdAndDelete(req.params.id)
            res.status(200).json({ success: true, message: 'Application withdrawn' })
        } catch (err) {
            res.status(500).json({ success: false, message: err.message })
        }
    }
)

//------------------- ADMIN -------------------

//Admin: view every application in the system
//NOTE: written above "/job/:jobId" style routes to avoid any route clash
applicationRoute.get(
    '/all',
    verifyToken,
    allowedRoles('ADMIN'),
    async (req, res) => {
        try {
            let applications = await ApplicationModel.find()
                .populate('job', 'title company')
                .populate('applicant', 'name email')
            res.status(200).json({
                success: true,
                count: applications.length,
                data: applications,
            })
        } catch (err) {
            res.status(500).json({ success: false, message: err.message })
        }
    }
)

//------------------- EMPLOYER -------------------

//Employer: view the applicants of a specific job (must own the job)
applicationRoute.get(
    '/job/:jobId',
    verifyToken,
    allowedRoles('EMPLOYER'),
    async (req, res) => {
        try {
            let job = await JobModel.findById(req.params.jobId)
            if (job === null) {
                return res
                    .status(404)
                    .json({ success: false, message: 'Job not found' })
            }
            if (job.postedBy.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: "You can't view applicants for someone else's job",
                })
            }
            let applications = await ApplicationModel.find({
                job: req.params.jobId,
            }).populate('applicant', 'name email skills')
            res.status(200).json({
                success: true,
                count: applications.length,
                data: applications,
            })
        } catch (err) {
            res.status(500).json({ success: false, message: err.message })
        }
    }
)

//Employer: shortlist or reject an application
applicationRoute.put(
    '/applications/:id',
    verifyToken,
    allowedRoles('EMPLOYER'),
    async (req, res) => {
        try {
            //populate the job so we can read its postedBy field
            let application = await ApplicationModel.findById(
                req.params.id
            ).populate('job')
            if (application === null) {
                return res
                    .status(404)
                    .json({ success: false, message: 'Application not found' })
            }
            //ownership is checked through the job that was applied to
            if (application.job.postedBy.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: "You can't update this application",
                })
            }
            let updated = await ApplicationModel.findByIdAndUpdate(
                req.params.id,
                { $set: { status: req.body.status } },
                { new: true, runValidators: true }
            )
            res.status(200).json({
                success: true,
                message: 'Application status updated',
                data: updated,
            })
        } catch (err) {
            res.status(500).json({ success: false, message: err.message })
        }
    }
)
