const { 
    Client, 
    PrivateKey, 
	tokenQuery,
    AccountCreateTransaction, 
    AccountBalanceQuery, 
    Hbar 
} = require('@hashgraph/sdk');
require('dotenv').config();

async function main() {
	const myAccountId = process.env.MY_ACCOUNT_ID;
	const myPrivateKey = process.env.MY_PRIVATE_KEY;

	if (myAccountId == null || myPrivateKey == null) {
		throw new Error('Env vars must be present!');
	}

	const client = Client.forTestnet();
	client.setOperator(myAccountId, myPrivateKey);
	console.log("CONNECTION SUCCESS!");
	let tokenSymbol = await tokenQuery.execute(client);
	console.log(tokenSymbol);
}

main();
