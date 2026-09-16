import { Schema, model } from 'mongoose'

const userSchema = new Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            minLength: [3, 'Min length of name should be 3'],
            maxLength: [30, 'Max length of name should not exceed 30'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            trim: true,
            unique: true,
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minLength: [4, 'Min length of password should be 4'],
            trim: true,
        },
        role: {
            type: String,
            enum: {
                values: ['JOBSEEKER', 'EMPLOYER', 'ADMIN'],
                message: 'Invalid role',
            },
            required: [true, 'Role is required'],
        },
        //only relevant if role is EMPLOYER
        companyName: {
            type: String,
            trim: true,
        },
        //only relevant if role is JOBSEEKER
        skills: {
            type: [String],
            default: [],
        },
        active: {
            type: Boolean,
            default: true,
        },
    },
    {
        versionKey: false,
        timestamps: true,
        strict: 'throw',
    }
)

export const UserModel = model('user', userSchema)
