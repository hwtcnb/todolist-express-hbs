const { Router } = require('express')
const User = require('../models/User')
const { ObjectId } = require('mongodb')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const keys = require('../config/keys')

const router = Router();

router.get('/', async (req, res) => {
    try {
        const token = req.headers.cookie.split('=')[1]
        jwt.verify(token, keys.jwt, async function (err, decoded) {
            if (!err) {
                const user = await User.findOne({ username: decoded.userName }).lean()
                const todos = user.titles
                res.render('index', {
                    title: 'Todo page',
                    isIndex: true,
                    todos,
                    username: decoded.userName
                })
            } else {
                res.redirect('/login')
            }
        })
    } catch {
        res.cookie('token', null)
        res.redirect('/login')
    }
    

})

router.post('/create', async (req, res) => {
    const data = req.body.title
    const token = req.headers.cookie.split('=')[1]
    jwt.verify(token, keys.jwt, async function (err, decoded) {
        if (!err) {
            await User.updateOne({ username: decoded.userName }, { $push: { titles: data } })
            res.redirect('/')
        } else {
            res.send(err)
        }
    })
})

router.get('/login', (req, res) => {
    const token = req.headers.cookie.split('=')[1]
    jwt.verify(token, keys.jwt, function (err, decoded) {
        if (!err) {
            res.redirect('/')
        } else {
            res.render('login', {
                title: 'Login',
                isLogin: true
            })
        }
    })
})

router.post('/login', async (req, res) => {
    try {
        let { username, password } = req.body
        const user = await User.findOne({ username }).lean()
        if (!user) {
            throw new Error('No such user')
        }
        const validPassword = bcrypt.compareSync(password, user.password)
        if (!validPassword) {
            throw new Error('Wrong password!')
        }
        let token = jwt.sign({
            userName: user.username,
            userId: user._id
        }, keys.jwt, { expiresIn: 60 * 60 })
        res.cookie('token', token)
        res.redirect('/')
    } catch (e) {
        res.render('login', {
            title: 'Login',
            isLogin: true,
            message: e.message
        })
    }
})

router.get('/signup', (req, res) => {
    res.render('registration', {
        title: 'Sign up',
        isSignUp: true
    })
})

router.post('/delete', (req, res) => {
    const token = req.headers.cookie.split('=')[1]
    jwt.verify(token, keys.jwt, async function (err, decoded) {
        if (!err) {
            const data = req.body.todos
            if (typeof data === 'string' && data !== null) {
                await User.updateOne({ username: decoded.userName }, { $pull: { titles: data } })
            }
            else {
                await User.updateOne({ username: decoded.userName }, { $pull: { titles: { $in: data } } })
            }
            res.redirect('/')
        } else {
            res.send(err)
        }
    })
})

router.post('/signup', async (req, res) => {
    try {
        let { username, password } = req.body
        const candidate = await User.findOne({ username })
        if (candidate) {
            throw new Error('User existing')
        }
        password = bcrypt.hashSync(password, 7)
        const titles = []
        const user = new User({ username, password, titles })
        await user.save()
        let token = jwt.sign({
            userName: user.username,
            userId: user._id
        }, keys.jwt, { expiresIn: 60 * 60 })
        res.cookie('token', token)
        res.redirect('/')
    } catch (e) {
        res.render('registration', {
            title: 'Sign up',
            isSignUp: true,
            message: e.message
        })
    }
})

router.get('/logout', async (req, res) => {
    const token = req.headers.cookie.split('=')[1]
    jwt.verify(token, keys.jwt, function (err, decoded) {
        if (!err) {
            res.render('logout', {
                title: 'Logout',
                username: decoded.userName,
                isLogOut: true
            })
        } else {
            res.render('logout', {
                title: 'Logout',
                isLogOut: true
            })
        }
    })
})

router.post('/logout', async (req, res) => {
    res.cookie('token', null)
    res.redirect('/login')
})


module.exports = router;

