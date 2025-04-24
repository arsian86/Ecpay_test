const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const  { v4: uuidv4 } = require('uuid');
const uuid = uuidv4().replace(/-/g, ''); // 移除中間的 dash（-）
const uuid16 = uuid.slice(0, 16); // 取前 16 個字元

const dayjs = require('dayjs');

const dotenv = require("dotenv");
dotenv.config();

const merchantId = process.env.MERCHANT_ID; // 商店代號
const hashKey = process.env.HASH_KEY; // AES 加密金鑰
const hashIv = process.env.HASH_IV; // AES 加密 IV 向量
const returnUrl = process.env.RETURN_URL; // 交易成功後跳轉回網站的 URL
//產生綠界要求的CheckMacValue
function generateCMV(params) {
	// Step 1: 排序參數（ASCII 升冪）
	const sorted = {};
	Object.keys(params).sort().forEach((key) => {
		if (params[key] !== "") {  
			sorted[key] = String(params[key]); // 確保參數值轉成字串
		}
	});
	console.log("sorted", sorted);
	
	// Step 2: 串接格式
	let raw = `HashKey=${hashKey}&`;
	raw += Object.entries(sorted).map(([key, val]) => `${key}=${val}`).join("&");
	raw += `&HashIV=${hashIv}`;
	console.log("raw", raw);

	// 專門處理綠界 CheckMacValue 所需的特殊編碼規則
	function encodeEcpayRaw(raw) {
		return encodeURIComponent(raw)
			.toLowerCase()
			.replace(/%20/g, '+')   // 空白轉 +
			.replace(/%21/g, '!')   // 驚嘆號不編碼
			.replace(/%28/g, '(')   // 左括號不編碼
			.replace(/%29/g, ')')   // 右括號不編碼
			.replace(/%2a/g, '*')   // 星號不編碼
			.replace(/%2d/g, '-')   // 減號不編碼
			.replace(/%2e/g, '.')   // 點號不編碼
			.replace(/%5f/g, '_');  // 底線不編碼
	}

	// Step 3: 特殊字元處理 + URL encode
	raw = encodeEcpayRaw(raw); // 用符合綠界規則的編碼方式處理 raw 字串
	console.log("raw", raw);

	// Step 4: SHA256 + 轉大寫
	const hash = crypto.createHash("sha256").update(raw).digest("hex").toUpperCase();
	console.log("hash", hash);
	return hash;
}

router.post("/create-order", async (req, res) => {
	try {
		const postdata = {
			MerchantID: merchantId,
			MerchantTradeNo: `ORD${uuid16}`,
			MerchantTradeDate: dayjs().format('YYYY/MM/DD HH:mm:ss'),
			PaymentType: "aio",
			TotalAmount: 300,
			TradeDesc: "健身訂閱課程",
			ItemName: "Wellness訂閱方案一個月",
			ReturnURL: returnUrl,
			ChoosePayment: "Credit",
			EncryptType: 1,
			ClientBackURL: returnUrl,
			PeriodAmount: 300,
			PeriodType: "M",
			Frequency: 1,
			ExecTimes: 12,
			PeriodReturnURL: returnUrl,
		};

		postdata.CheckMacValue = generateCMV(postdata);
		console.log("postdata", postdata);
		// const postdataAES = encryptTradeInfo(postdata);


		const formInputs = Object.entries(postdata)
			.map(([key, value]) => `<input type="hidden" name="${key}" value="${value}" />`)
			.join("\n");

		const form = `
		<form id="ecpay-form" method="post" action="https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5">
		${formInputs}
		</form>
		<script>document.getElementById('ecpay-form').submit();</script>
		`;
		console.log("form", form);
		res.send(form);
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
});

router.post("/cancel-payment",async(req,res)=>{
	try{
		const postdata = {
			MerchantID: merchantId,
			MerchantTradeNo: "ORD0ebb4507d2de4170",
			Action: "Cancel",
			TimeStamp: dayjs().unix(), // 確保每次發送時為最新時間
		};
		postdata.CheckMacValue = generateCMV(postdata);
		console.log("postdata", postdata);

		const formInputs = Object.entries(postdata)
		.map(([key, value]) => `<input type="hidden" name="${key}" value="${value}" />`)
		.join("\n");
		const form = `
	<form id="cancel-form" method="post" action="https://payment-stage.ecpay.com.tw/Cashier/CreditCardPeriodAction">
	${formInputs}
	</form>
	<script>document.getElementById('cancel-form').submit();</script>
	`;
	console.log("form", form);
	res.send(form);
} catch (error) {
	res.status(500).json({ success: false, error: error.message });
}
});

module.exports = router;
