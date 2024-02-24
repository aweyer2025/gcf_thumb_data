//Imports
const {Storage} = require('@google-cloud/storage');
const path = require('path');
const fs = require ('fs-extra');
const os = require('os');
const sharp = require('sharp');
const getExif = require('exif-async');
const parseDMS = require('parse-dms');
const { read } = require('fs');
const {FireStore, Firestore} = require('@google-cloud/firestore');

//Entry point fucntion
exports.generate_thumb_data = async (file, context) =>{
    const gcsFile = file;
    const storage = new Storage();
    const sourceBucket = storage.bucket(gcsFile.bucket);
    const thumbnailsBucket = storage.bucket('sp24-41200-antweyer-gj-tumbnails');
    const finalBucket = storage.bucket('sp24-41200-antweyer-gj-final');





    //check if correct file type
    let fileExtension = '';
    let vaildFile = false;
    if (gcsFile.contentType === 'image/jpeg'){
        console.log('File type is jpg');
        fileExtension = 'jpg';
        vaildFile = true
    }else if (gcsFile.contentType === 'image/png'){
        console.log('File type is png');
        fileExtension = 'png';
        vaildFile = true;
    }else{
        console.log('This is not a valid File.')
        sourceBucket.file(gcsFile.name).delete;
        return;
    }
    if (vaildFile){
        
        //Create new file name for final version
        const finalFileName = `${gcsFile.generation}.${fileExtension}`;
        console.log(`${finalFileName}`)

        //creates working directory
        const workingDir = path.join(os.tmpdir(), 'thmbs');
        console.log(`working directory is created ${workingDir}`)

        //creates "local" file name
        const tempFilePath = path.join(workingDir, finalFileName);
        console.log(`Local File path: ${tempFilePath}`);

        //create file name for thumbnail image
        const thumbName = `thumb@64_${finalFileName}`;
        console.log(`Thumbnail image name created ${finalFileName}`);

        //create "lcoal" thumbnail path
        const thumbPath = path.join(workingDir,thumbName);
        console.log(`local thumbnail path: ${thumbPath}`);

        //waits for working dir to be ready
        await fs.ensureDir(workingDir);

        // downloads OG file to "local" path
        await sourceBucket.file(gcsFile.name).download({
            destination: tempFilePath
        });
        console.log(`Downloaded file with path of: ${tempFilePath}`);


        
        //gets GPS data
        async function readExifData(localFile){
            try{
                let exifData =await getExif(localFile);
                return exifData.gps;
            }catch(err){
                console.log(err);
                return null;
            }
        }
        let gpsObject = await readExifData(tempFilePath);
        console.log(gpsObject.GPSLatitude);
        const latStr = parseDMS(`${gpsObject.GPSLatitude[0]}:${gpsObject.GPSLatitude[1]}:${gpsObject.GPSLatitude[2]}`);
        const lonStr = parseDMS(`${gpsObject.GPSLongitude[0]}:${gpsObject.GPSLongitude[1]}:${gpsObject.GPSLongitude[2]}`);
        console.log(latStr);
        console.log(lonStr);
        
        
        
       //resizes to thumbnail
        await sharp(tempFilePath).resize(64).withMetadata().toFile(thumbPath).then(async ()=>{
            await thumbnailsBucket.upload(thumbPath);
        })
        console.log(`thumbnail is uploaded to thumbnail bucket ${thumbName}`)

        //upload to final bucket
        await finalBucket.upload(tempFilePath);
        console.log(`fullsize image is uploaded to final bucket ${gcsFile.name}`);

        //writing to FS
        async function writeToFs(){
            const fireStore = new Firestore({
                projectId: 'sp24-41200-antweyer-globaljags',
                databaseId: 'gcf-gen-thumb-data'
            });

            let picDataObj = {};

            picDataObj.imageName = finalFileName;
            picDataObj.imageURL = `gs://sp24-41200-antweyer-gj-final/${finalFileName}`
            picDataObj.lat = latStr
            picDataObj.lon = lonStr
            picDataObj.thumbURL = `gs://sp24-41200-antweyer-gj-tumbnails/${thumbName}`
            //write to firestore
            console.log(picDataObj.imageName);
            let collectionRef =  fireStore.collection('photos');
            let documentRef = collectionRef.add(picDataObj);
        }
        writeToFs()
        

        


        //deletes working directory on VM
        await fs.remove(workingDir);
        console.log(`files deleted from working local dir`);
        
        
    }
    await console.log(gcsFile.name);
    // await sourceBucket.file(gcsFile.name).delete();
    console.log(`Deleted file from uploads bucket: ${gcsFile.name}`);


}