import React, { useEffect } from 'react'
import './Verify.css'
import { useNavigate } from 'react-router-dom'

// Payments are now verified in-page via Razorpay Checkout. This route only
// exists so old Stripe redirect links still land somewhere sensible.
const Verify = () => {
    const navigate = useNavigate();

    useEffect(() => {
        navigate("/myorders", { replace: true });
    }, [navigate])

    return (
        <div className='verify'>
            <div className="spinner"></div>
        </div>
    )
}
export default Verify
