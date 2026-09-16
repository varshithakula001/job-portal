import exp from 'express'
import { JobModel } from '../models/JobModel.js'
import { ApplicationModel } from '../models/ApplicationModel.js'
import { verifyToken } from '../middlewares/tokenVerificationMiddleware.js'
import { allowedRoles } from '../middlewares/allowedRolesMiddleware.js'

export const jobRoute = exp.Router()

//------------------- EMPLOYER -------------------

//Employer: post a new job
jobRoute.post('/jobs', verifyToken, allowedRoles('EMPLOYER'), async (req, res) => {
    try {
        let newJob = req.body
        //the employer id is taken from the token, never from the request body
        newJob.postedBy = req.user.id
        let jobDocument = await JobModel.create(newJob)
        res.status(201).json({
            success: true,
            message: 'Job posted',
            data: jobDocument,
        })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

//Employer: view only MY posted jobs
//NOTE: this must be written ABOVE "/jobs/:id", otherwise express would
//treat the word "my-jobs" as an :id value
jobRoute.get('/my-jobs', verifyToken, allowedRoles('EMPLOYER'), async (req, res) => {
    try {
        let jobs = await JobModel.find({ postedBy: req.user.id })
        res.status(200).json({ success: true, count: jobs.length, data: jobs })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

//------------------- PUBLIC -------------------

//Anyone (even logged out): view all open jobs
//supports optional filters: /jobs?location=Hyderabad&title=backend
jobRoute.get('/jobs', async (req, res) => {
    try {
        let filter = { status: 'OPEN' }
        if (req.query.location !== undefined) {
            filter.location = req.query.location
        }
        if (req.query.title !== undefined) {
            //case-insensitive partial search on the title
            filter.title = { $regex: req.query.title, $options: 'i' }
        }
        let jobs = await JobModel.find(filter).populate(
            'postedBy',
            'name companyName email'
        )
        res.status(200).json({ success: true, count: jobs.length, data: jobs })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

//Anyone: view a single job by id
jobRoute.get('/jobs/:id', async (req, res) => {
    try {
        let job = await JobModel.findById(req.params.id).populate(
            'postedBy',
            'name companyName email'
        )
        if (job === null) {
            return res
                .status(404)
                .json({ success: false, message: 'Job not found' })
        }
        res.status(200).json({ success: true, data: job })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

//------------------- EMPLOYER / ADMIN -------------------

//Employer: update MY job (ownership is checked)
jobRoute.put('/jobs/:id', verifyToken, allowedRoles('EMPLOYER'), async (req, res) => {
    try {
        let job = await JobModel.findById(req.params.id)
        if (job === null) {
            return res
                .status(404)
                .json({ success: false, message: 'Job not found' })
        }
        //an employer can only edit their own job, not another employer's job
        if (job.postedBy.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "You can't edit someone else's job",
            })
        }
        //postedBy must never be changed by the request body
        let updates = req.body
        delete updates.postedBy

        let updatedJob = await JobModel.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true, runValidators: true }
        )
        res.status(200).json({
            success: true,
            message: 'Job updated',
            data: updatedJob,
        })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

//Employer: delete MY job, Admin: delete any job
//deleting a job also deletes all applications made to that job
jobRoute.delete(
    '/jobs/:id',
    verifyToken,
    allowedRoles('EMPLOYER', 'ADMIN'),
    async (req, res) => {
        try {
            let job = await JobModel.findById(req.params.id)
            if (job === null) {
                return res
                    .status(404)
                    .json({ success: false, message: 'Job not found' })
            }
            //an employer can delete only their own job, an admin can delete any
            if (
                req.user.role === 'EMPLOYER' &&
                job.postedBy.toString() !== req.user.id
            ) {
                return res.status(403).json({
                    success: false,
                    message: "You can't delete someone else's job",
                })
            }
            await JobModel.findByIdAndDelete(req.params.id)
            //clean up the applications that belonged to this job
            await ApplicationModel.deleteMany({ job: req.params.id })
            res.status(200).json({
                success: true,
                message: 'Job deleted along with its applications',
            })
        } catch (err) {
            res.status(500).json({ success: false, message: err.message })
        }
    }
)
