import jwt from 'jsonwebtoken'

export function verifyToken(req, res, next) {
    //read the token from the httpOnly cookie
    let accessToken = req.cookies.accessToken
    if (accessToken === undefined) {
        return res
            .status(401)
            .json({ success: false, message: 'You must login to continue' })
    }
    try {
        let decodedToken = jwt.verify(accessToken, process.env.SECRET_KEY)
        //attach the logged-in user's id and role to the request
        req.user = decodedToken
        next()
    } catch (err) {
        return res
            .status(401)
            .json({ success: false, message: 'Please relogin to continue' })
    }
}
