import React from 'react'
import { useUser } from '../../context/userContext'
import { Navigate, Outlet } from 'react-router-dom';

function IsLogin() {
    const { user, loading } = useUser(); // Make sure to destructure loading if it exists in your context

    if (loading) return <div>Loading...</div>
    
    return (
        user ? <Outlet/> : <Navigate to='/login'/>
    )
}     

export default IsLogin