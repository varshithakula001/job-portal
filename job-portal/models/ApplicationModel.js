import { Schema, model } from 'mongoose'

const applicationSchema = new Schema(
    {
        //REFERENCE - which job this application is for
        job: {
            type: Schema.Types.ObjectId,
            ref: 'job',
            required: [true, 'Job reference is required'],
        },
        //REFERENCE - which job seeker applied
        applicant: {
            type: Schema.Types.ObjectId,
            ref: 'user',
            required: [true, 'Applicant reference is required'],
        },
        coverLetter: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: {
                values: ['PENDING', 'SHORTLISTED', 'REJECTED'],
                message: 'Invalid status',
            },
            default: 'PENDING',
        },
    },
    {
        versionKey: false,
        timestamps: true,
        strict: 'throw',
    }
)

export const ApplicationModel = model('application', applicationSchema)
