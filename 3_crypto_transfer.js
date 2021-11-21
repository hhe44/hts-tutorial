const { 
    Client, 
    TransferTransaction,
    Hbar 
} = require('@hashgraph/sdk');
require('dotenv').config();

async function transferHbar() {

    const OPERATOR_ID = process.env.MY_ACCOUNT_ID;

	// forTestNet => selects random node from testnet
	const client = Client.forTestnet();

	// an operator will sign the transfer & pay the fees
	client.setOperator(OPERATOR_ID, process.env.MY_PRIVATE_KEY);

	// Create a transaction to transfer 100 hbars
	const transaction = new TransferTransaction()
		.addHbarTransfer(OPERATOR_ID, new Hbar(-500))
		.addHbarTransfer("0.0.12717565", new Hbar(500));

	//Submit the transaction to a Hedera network
	const txResponse = await transaction.execute(client);

	//Request the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);

	//Get the transaction consensus status
	const transactionStatus = receipt.status;

	console.log('The transaction consensus status is ' + transactionStatus.toString());

	//v2.0.5
}

transferHbar()