import express from 'express';
import morgan from 'morgan';
import path from 'path';
import cors from 'cors';
import bodyParser from 'body-parser';
import ApiRouter from './api';
import mongoose from "mongoose";
import open from 'opn';

// noinspection JSIgnoredPromiseFromCall
mongoose.connect('mongodb://localhost:27017/versions', {useNewUrlParser: true});
let port = process.env.PORT || 3000;

const app = express(),
    openBrowser = process.env.OPEN_BROWSER || false,
    listen = () => {
        console.log(`Server Start Listening On Port ${port}`);
        if (openBrowser) {
            open(`http://localhost:${port}`);
        }
    };

let server = app.listen(port, listen);
const startServerListeners = () => {
    server
        .on('error', (e) => {
            switch (e.code) {
                case 'EADDRINUSE':
                    server = app.listen(port, listen);
                    startServerListeners();
            }
        });
};

app.use(morgan(":url :method :status"));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(bodyParser.json());

app.use('/api', ApiRouter);

app.use((req, res) => {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
