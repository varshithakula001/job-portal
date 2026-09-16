import { Schema, model } from 'mongoose'

const jobSchema = new Schema(
    {
        title: {
            type: String,
            required: [true, 'Job title is required'],
            trim: true,
        },
        description: {
            type: String,
            required: [true, 'Job description is required'],
            trim: true,
        },
        company: {
            type: String,
            required: [true, 'Company name is required'],
            trim: true,
        },
        location: {
            type: String,
            required: [true, 'Location is required'],
            trim: true,
        },
        salary: {
            type: Number,
            required: [true, 'Salary is required'],
        },
        //EMBEDDED array - lives directly inside the job document
        requirements: {
            type: [String],
            default: [],
        },
        //REFERENCE - stores only the ObjectId of the employer who posted it
        postedBy: {
            type: Schema.Types.ObjectId,
            ref: 'user',
            required: [true, 'postedBy is required'],
        },
        status: {
            type: String,
            enum: {
                values: ['OPEN', 'CLOSED'],
                message: 'Invalid status',
            },
            default: 'OPEN',
        },
    },
    {
        versionKey: false,
        timestamps: true,
        strict: 'throw',
    }
)

export const JobModel = model('job', jobSchema)
