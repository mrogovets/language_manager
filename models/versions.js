import {Schema, model} from 'mongoose';


const versionSchema = new Schema({
    "version_no": Number,
    "date_added": {type: Date, default: Date.now},
    "current": {type: Boolean, default: true},
    "languages": {
        type: Array,

    }
});

const Version = model('versions', versionSchema);
export default Version;
