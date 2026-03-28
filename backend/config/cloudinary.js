import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});


// const uplodOnCloudinary = async (localfilePath) => {
//   try {

//     if (!localfilePath) {
//       console.log("cannot find the file path on local")
//       return null;
//     }

//     const response = await cloudinary.uploader.upload(localfilePath, {
//       resource_type: "auto",

//     });
//     console.log("file uploaded on cloudinary ", response);
//     return response;
//   }
//   //upload file on cloudinary

//   catch (error) {
//     fs.unlinkSync(localfilePath);
//     console.log("error while uploading file on cloudinary", error);
//   }
// }

export default cloudinary;
