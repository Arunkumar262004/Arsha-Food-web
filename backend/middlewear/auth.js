import jwt from 'jsonwebtoken';

const authMiddlewear = async(req,res,next) =>{
    const {token} = req.headers;
    if(!token){
        return res.json({success:false,message:"Not Authorised Login  "})
    }

    try{
        const tokendecode =jwt.verify(token,process.env.JWT_SECRET);
        // Admin tokens are for the admin panel only.
        if (tokendecode.type === "admin") {
            return res.json({success:false,message:"Not Authorised Login  "})
        }
        req.body = req.body || {};
        req.body.userId = tokendecode.id;
        next();
    }catch (error){
        return res.json({success:false,message:"Token Expired Login Again"})

    }
}


export default authMiddlewear;
