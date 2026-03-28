import React from "react";
import { useAuth } from "@clerk/react"
import { useEffect } from "react"

function Dashboard() {

    const { getToken } = useAuth()

    useEffect(() => {

        const syncUser = async () => {

            const token = await getToken()

            const res = await fetch("http://localhost:5000/api/users", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            const data = await res.json()
            console.log(data)

        }

        syncUser()

    }, [getToken])

    return (
        <div>
            <h1>Dashboard</h1>
            <p>User synced with backend</p>
        </div>
    )
}

export default Dashboard