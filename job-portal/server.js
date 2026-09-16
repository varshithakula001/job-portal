import 'dotenv/config'
import exp from 'express'
import { connect } from 'mongoose'
import cookieParser from 'cookie-parser'
import { userRoute } from './APIs/userAPI.js'
import { jobRoute } from './APIs/jobAPI.js'
import { applicationRoute } from './APIs/applicationAPI.js'

const app = exp()

//body parser - lets the server read JSON sent from the client/Postman
app.use(exp.json())

//cookie parser - MUST be before the routes, otherwise req.cookies is undefined
app.use(cookieParser())

//routes
app.use('/user-api', userRoute)
app.use('/job-api', jobRoute)
app.use('/application-api', applicationRoute)

//DB config
async function connectDB() {
    try {
        await connect(process.env.DB_URL)
        console.log('DB connected')
        app.listen(process.env.PORT, () =>
            console.log(`Server listening on port ${process.env.PORT}`)
        )
    } catch (err) {
        console.log('err in db connection', err)
    }
}

connectDB()

//error handling middleware (must be last)
app.use((err, req, res, next) => {
    console.log('Err is', err)
    res.status(500).json({ success: false, message: err.message })
})
