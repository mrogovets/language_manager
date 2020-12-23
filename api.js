import {CreateVersion} from "./helpers";
import { Router} from 'express';
import multer from "multer";
import fs from "fs-extra";
import Version from './models/versions';
import path from 'path';

const router = Router(),
    uploadDist = path.join(__dirname, 'uploads'),
    storage = multer.diskStorage({
        destination: function (req, file, cb) {
            const filePath = path.join(uploadDist, file.originalname);
            const exists = fs.existsSync(filePath);
            if (exists) fs.removeSync(filePath);
            cb(null, uploadDist);
        },
        filename: function (req, file, cb) {
            req.body[file.fieldname] = file.originalname;
            cb(null, file.originalname);
        }
    }),
    upload = multer({
        storage
    });
router.get('/', async (req, res) => {
    if (req.query.hasOwnProperty('current')) {
        Version.findOne({
            current: true
        }, (err, doc) => {
            if (err) console.log(err);
            return res.json(doc);
        });
    } else {
        Version.find({}, (err, doc) => {
            if (err) console.log(err);
            return res.json(doc);
        });
    }
});

router.post('/', upload.single('file'), async (req, res) => {
    const creation = new CreateVersion(req.body.file, uploadDist);
    if (creation.invalid) {
        return res.status(500).send({
            status: false,
            error: 'Can\'t Get Current language'
        });
    }
    await creation.dir();
    await creation.validate();
    creation.doc();
    return res.json({
        status: true
    });
});

router.post('/langs', async (req, res) => {
    Version.findOne({
        current: true
    }, (err, doc) => {
        if (err) console.log(err);
        if(!doc){
            return res.status(422).send({status: false, message: 'You need to have at least one language version to create new one'});
        }
        const langs = doc.languages;
        const target = langs[langs.findIndex(arr => req.body.duplicate ? (arr.language_file === req.body.duplicate) : arr.language_file === 'en_US')];
        const versionFile = path.join(__dirname, 'versions', `version_${doc.version_no}`, target.language_file + '.json');
        const versionDir = path.join(__dirname, 'versions', `version_${doc.version_no}`);
        const fileContent = fs.readJsonSync(versionFile);
        if (!req.body.duplicate) {
            Object.keys(fileContent).map((key) => {
                fileContent[key] = "";
            });
        }
        fs.writeJsonSync(path.join(versionDir, req.body.newName + '.json'), fileContent);
        doc.languages.push({"language_file": req.body.newName, "translation_done": false});

        doc.save();
        return res.json({status: true});
    });
});

export default router;
