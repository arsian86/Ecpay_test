const express = require("express");
const app = express();

const dotenv = require("dotenv");
dotenv.config();

const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const paymentRouter = require("./payment");
app.use("/payment", paymentRouter);


const http = require("http");
const server = http.createServer(app);
const port = process.env.PORT || 80;

server.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
