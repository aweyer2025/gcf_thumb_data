//Imports
const {Storage} = require('@google-cloud/storage');
const path = require('path');
const fs = require ('fs-extra');
const os = require('os');
const sharp = require('sharp');


//Entry point fucntion
exports.generate_thumb_data = async (file, context) =>{
    const gcsFile = file;
    const storage = new Storage();
    const sourceBucket = storage.bucket(gcsFile.bucket);
    const thumbnailsBucket = storage.bucket('sp24-41200-antweyer-gj-tumbnails');
    const finalBucket = storage.bucket('sp24-41200-antweyer-gj-final');

    //Creates file name
    const finalFileName = `${gcsFile.generation}`;
    //creates working directory
    const workingDir = path.join(os.tmpdir(), 'thmbs');
    //creates "local" file name
    const tempFilePath = path.join(workingDir, finalFileName);
    console.log(`File path: ${tempFilePath}`);
    //waits for working dir to be ready
    await fs.ensureDir(workingDir);
    //downloads OG file to "local" path
    await sourceBucket.file(gcsFile.name).download({
        destination: tempFilePath
    });
    console.log(`Downloaded file with path of: ${tempFilePath}`);
    await sourceBucket.file(gcsFile.name).delete({tempFilePath});


}