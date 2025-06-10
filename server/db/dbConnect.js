const mongoose = require('mongoose');


const dbConnect = async () => {
     try{
        await mongoose.connect(process.env.MONGOOSE_CONNECTION),
        console.log("Connected to Database");
     } catch (error){
        console.log(error);
     }
}

module.exports = dbConnect;
