import { NextRequest, NextResponse } from "next/server";
import { database } from "@/db/knex";
import { generateAuthToken, setAuthCookies } from "@/app/lib/server-helpers";
import { SignupShema } from "@/app/validation/schema";
import { z } from 'zod'

const bcrypt = require('bcryptjs')

export async function POST(req: NextRequest) {
    try {
        const { username, email, password } = await req.json()

        // ensure all field are filled
        if (!username)
            return NextResponse.json({ success: false, error: 'Username is required' })

        if (!email)
            return NextResponse.json({ success: false, error: 'Email is requried' })

        if (!password)
            return NextResponse.json({ success: password, error: 'Password is required' })

        // validate the incomming data against zod
        const validateData = SignupShema.parse({ username, email, password })

        // check if incoming data exist in the db
        const userExists = await database('UserProfile').where('email', validateData.email).first()

        if (userExists)
            return NextResponse.json({ success: false, error: 'User already exist' }, { status: 409 })

        //hash password before storing
        const hashedPassword = bcrypt.hashSync(password, 8)

        const newUser = await database('UserProfile').insert({
            username: validateData.username,
            email: validateData.email,
            password: hashedPassword,
            last_login_at: new Date()
        }).returning('*')

        const authToken = generateAuthToken(newUser._id)
        setAuthCookies(authToken)

        return NextResponse.json({
            success: true,
            msg: 'User registered successfully'
        }, { status: 201 })

    } catch (e) {
        // zod validation error
        if (e instanceof z.ZodError) {
            const formattedError = e.errors.map(err => err.message)
            return NextResponse.json({ success: false, error: formattedError }, { status: 400 })
        } else {
            console.log('An error occured', e)
            return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
        }

    }
}
