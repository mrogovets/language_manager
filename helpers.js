import fs from 'fs-extra';
import path from 'path';
import {isEqual, transform, isObject, cloneDeep} from 'lodash';
import Version from "./models/versions";

export class CreateVersion {
    _doc;
    nextVersion;
    target;
    current;
    langsPath = path.join(__dirname, 'versions');
    uploadDist;
    file;
    db;
    invalid = false;
    versionStr = {
        current: '',
        next: ''
    };

    constructor(file, uploadDist) {
        this.db = Version;
        this.file = file;
        this.uploadDist = uploadDist;
    }

    async find() {
        return new Promise((resolve) => {
            this.db.findOne({
                current: true
            }, (err, doc) => {
                if (err) throw err;
                if (!doc) {
                    this.invalid = true;
                    doc = new Version({
                        version_no: 0,
                        current: true
                    });
                }
                this._doc = doc;
                this.nextVersion = doc.version_no + 1;
                this.versionStr.next = `version_${this.nextVersion}`;
                this.versionStr.current = `version_${doc.version_no}`;
                this.target = path.join(this.langsPath, this.versionStr.next, this.file);
                this.current = path.join(this.langsPath, this.versionStr.current);
                resolve();
            });
        });

    }

    async dir() {
        await this.find();

        const currentPath = path.join(this.langsPath, this.versionStr.current);
        fs.ensureDirSync(path.join(this.langsPath, this.versionStr.next));
        if (fs.existsSync(currentPath)) {
            fs.copySync(currentPath, path.join(this.langsPath, this.versionStr.next));
            const exists = fs.existsSync(this.target);
            if (exists) {
                fs.removeSync(this.target);
            }
        }
        return this;
    }

    async validate() {
        const files = cloneDeep(this._doc.languages);
        console.log(files);
        const uploadedFilePath = path.join(this.uploadDist, this.file);
        if (files.length) {
            const target = files[files.findIndex(arr => arr.translation_done)];
            const targetFilePath = path.join(this.current, target.language_file + '.json');
            const newFile = fs.readJsonSync(uploadedFilePath);
            const targetFile = fs.readJsonSync(targetFilePath);
            const diffs = {};
            for(let i in newFile){
                if(!targetFile.hasOwnProperty(i)){
                    diffs[i] = "";
                }
            }
            const targetPath = path.join(this.langsPath, this.versionStr.next);
            files.forEach(file => {
                if (file.language_file !== this.file.substring(0, this.file.indexOf('.'))) {
                    const fileLocation = path.join(targetPath, file.language_file + '.json');
                    console.log(fileLocation);
                    let fileContent = fs.readJsonSync(fileLocation);
                    fileContent = {...fileContent, ...diffs};
                    console.log(fileContent);
                    fs.writeJsonSync(fileLocation, fileContent);
                }

            });
        }
        try {
            fs.moveSync(uploadedFilePath, this.target);
        } catch (e) {
        }
    }

    doc() {
        const newDoc = this._doc.toObject();
        const newFileName = this.file.substring(0, this.file.indexOf('.'));
        let filesNames = [];
        if (!newDoc.languages) {
            newDoc.languages = [];
        }else{
            filesNames = newDoc.languages.map(language => language.language_file);
        }
        if (!filesNames.includes(newFileName)) {
            newDoc.languages.push({
                language_file: newFileName,
                translation_done: true
            });
        }
        newDoc.languages = newDoc.languages.map(lang => {
            lang.translation_done = lang.language_file === newFileName;
            return lang;
        });
        delete newDoc._id;
        newDoc.date_added = (new Date()).toISOString();
        newDoc.version_no = this.nextVersion;
        this.db.create(newDoc, (err) => {
            if (err) console.log(err);
            this._doc.updateOne({
                $set: {
                    current: false
                }
            }, {}, () => {
                return this;
            });
        });
    }

    difference(object, base) {
        function changes(object, base) {
            return transform(object, function (result, value, key) {
                if (!isEqual(value, base[key])) {
                    result[key] = (isObject(value) && isObject(base[key])) ? changes(value, base[key]) : value;
                }
            });
        }

        return changes(object, base);
    }
}
