import exp from 'express'
import { hash, compare } from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { UserModel } from '../models/UserModel.js'
import { verifyToken } from '../middlewares/tokenVerificationMiddleware.js'
import { allowedRoles } from '../middlewares/allowedRolesMiddleware.js'

export const userRoute = exp.Router()

//------------------- PUBLIC ROUTES -------------------

//Register (JOBSEEKER / EMPLOYER / ADMIN)
userRoute.post('/register', async (req, res) => {
    try {
        let newUser = req.body

        //an ADMIN account can only be created with the admin secret key
        //(otherwise anyone could register themselves as ADMIN from Postman)
        if (newUser.role === 'ADMIN') {
            if (newUser.adminSecret !== process.env.ADMIN_SECRET) {
                return res.status(403).json({
                    success: false,
                    message: 'Invalid admin secret, cannot create ADMIN account',
                })
            }
        }
        //adminSecret is not part of the schema, so remove it before saving
        delete newUser.adminSecret

        //check if the email is already registered
        let existingUser = await UserModel.findOne({ email: newUser.email })
        if (existingUser !== null) {
            return res
                .status(409)
                .json({ success: false, message: 'Email already registered' })
        }

        //hash the password before storing it
        let hashedPassword = await hash(newUser.password, 12)
        newUser.password = hashedPassword

        let userDocument = await UserModel.create(newUser)
        userDocument.password = undefined //never send the password back
        res.status(201).json({
            success: true,
            message: 'User registered',
            data: userDocument,
        })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

//Login
userRoute.post('/login', async (req, res) => {
    try {
        let credObj = req.body
        let user = await UserModel.findOne({ email: credObj.email })
        if (user === null) {
            return res
                .status(404)
                .json({ success: false, message: 'Invalid Email' })
        }
        //blocked/deactivated users cannot login
        if (user.active === false) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been deactivated',
            })
        }
        //compare the plain password with the stored hash
        let result = await compare(credObj.password, user.password)
        if (result === false) {
            return res
                .status(404)
                .json({ success: false, message: 'Invalid Password' })
        }
        //create a signed JWT containing the id and role
        let signedToken = jwt.sign(
            { id: user._id, role: user.role },
            process.env.SECRET_KEY,
            { expiresIn: '1d' }
        )
        //store the token in an httpOnly cookie (JS on the browser cannot read it)
        res.cookie('accessToken', signedToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
        })
        res.status(200).json({
            success: true,
            message: 'Login success',
            role: user.role,
            name: user.name,
        })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

//Logout
userRoute.post('/logout', async (req, res) => {
    res.clearCookie('accessToken', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
    })
    res.status(200).json({ success: true, message: 'Logout success' })
})

//------------------- PROTECTED ROUTES -------------------

//Any logged-in user: get my own profile
userRoute.get('/profile', verifyToken, async (req, res) => {
    try {
        let user = await UserModel.findById(req.user.id).select('-password')
        res.status(200).json({ success: true, data: user })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

//Any logged-in user: update my own profile
userRoute.put('/profile', verifyToken, async (req, res) => {
    try {
        //these fields must never be changed by the user themselves
        let updates = req.body
        delete updates.password
        delete updates.role
        delete updates.active
        delete updates.email

        let updatedUser = await UserModel.findByIdAndUpdate(
            req.user.id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password')
        res.status(200).json({
            success: true,
            message: 'Profile updated',
            data: updatedUser,
        })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

//------------------- ADMIN ONLY -------------------

//Admin: get all users
userRoute.get('/all', verifyToken, allowedRoles('ADMIN'), async (req, res) => {
    try {
        let users = await UserModel.find().select('-password')
        res.status(200).json({ success: true, count: users.length, data: users })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

//Admin: deactivate a user
userRoute.put(
    '/deactivate/:id',
    verifyToken,
    allowedRoles('ADMIN'),
    async (req, res) => {
        try {
            let updatedUser = await UserModel.findByIdAndUpdate(
                req.params.id,
                { $set: { active: false } },
                { new: true }
            ).select('-password')
            if (updatedUser === null) {
                return res
                    .status(404)
                    .json({ success: false, message: 'User not found' })
            }
            res.status(200).json({
                success: true,
                message: 'User deactivated',
                data: updatedUser,
            })
        } catch (err) {
            res.status(500).json({ success: false, message: err.message })
        }
    }
)

//Admin: activate a user again
userRoute.put(
    '/activate/:id',
    verifyToken,
    allowedRoles('ADMIN'),
    async (req, res) => {
        try {
            let updatedUser = await UserModel.findByIdAndUpdate(
                req.params.id,
                { $set: { active: true } },
                { new: true }
            ).select('-password')
            if (updatedUser === null) {
                return res
                    .status(404)
                    .json({ success: false, message: 'User not found' })
            }
            res.status(200).json({
                success: true,
                message: 'User activated',
                data: updatedUser,
            })
        } catch (err) {
            res.status(500).json({ success: false, message: err.message })
        }
    }
)

//Admin: delete a user permanently
userRoute.delete(
    '/users/:id',
    verifyToken,
    allowedRoles('ADMIN'),
    async (req, res) => {
        try {
            let deletedUser = await UserModel.findByIdAndDelete(req.params.id)
            if (deletedUser === null) {
                return res
                    .status(404)
                    .json({ success: false, message: 'User not found' })
            }
            res.status(200).json({ success: true, message: 'User deleted' })
        } catch (err) {
            res.status(500).json({ success: false, message: err.message })
        }
    }
)
